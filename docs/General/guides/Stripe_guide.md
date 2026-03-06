Tratamiento de errores avanzados
Descubre cómo interpretar los errores a nivel de HTTP.
Pregunta sobre esta página
Copia para LLM

Ver como Markdown
En esta página se tratan dos temas avanzados de control de errores:

Respuestas HTTP que representan errores
Idempotencia y reintentos
Es posible que esta información no sea relevante para tu caso. Los SDK oficiales de Stripe pueden manejar la mayoría de los detalles relacionados con HTTP y los reintentos. Si utilizas una biblioteca cliente, empieza por aquí:

Gestión de errores
Códigos de error
Errores en HTTP
Incluso cuando falla una llamada a la API, nuestras bibliotecas del cliente ponen a disposición la información de error lanzando una excepción o devolviendo un valor de error. Sin embargo, si no usas bibliotecas del cliente, o si surge una situación inusual, es posible que necesites detalles de bajo nivel sobre las respuestas HTTP y sobre cuándo las emitimos.

Desde el punto de vista de HTTP, los errores se dividen en tres categorías principales:

Error de contenido: Contenido no válido en la solicitud de API.
Error de red: Problemas de comunicación intermitente entre el cliente y el servidor.
Error del servidor: Un problema en los servidores de Stripe.
Cada tipo de error requiere un enfoque y una semántica de idempotencia diferentes. Al final de esta página se proporciona una lista completa de códigos de respuesta y su significado.

Errores de contenido
Los errores de contenido se deben a un contenido no válido de una petición a la API. Devuelven una respuesta HTTP con un código de respuesta 4xx. Por ejemplo, los servidores de la API pueden devolver un 401 si has proporcionado una clave de API no válida, o un 400 si falta un parámetro obligatorio. Las integraciones deben corregir la petición original y volver a intentarlo. Según el tipo de error del usuario (por ejemplo, el rechazo de una tarjeta), es posible gestionar el problema mediante programación. En estos casos, incluye un campo de code para ayudar a que la integración reaccione de manera adecuada. Consulta los códigos de error para obtener más información.

En caso de una operación POST con una clave de idempotencia, siempre que la ejecución haya sido iniciada por un método de API, los servidores de API de Stripe almacenarán los resultados de la solicitud independientemente de cuáles hayan sido. Una solicitud que devuelve un error 400, volverá a enviar el mismo error 400 si le sigue una nueva solicitud con la misma clave de idempotencia. Para que el resultado sea correcto, debes generar una nueva clave de idempotencia al modificar la solicitud original. Respecto de esta operación, hay algunas advertencias. Por ejemplo, una solicitud con un código de error 429 por límite de velocidad, puede obtener un resultado diferente con la misma clave de idempotencia porque los limitadores de velocidad se ejecutan antes que la capa de idempotencia de la API. Lo mismo se aplica a un error 401 por omisión de una clave de API o a la mayoría de los errores 400 por envío de parámetros no válidos. Aun así, la estrategia más segura en lo que respecta a errores 4xx es generar siempre una nueva clave de idempotencia.

Errores de la red
Los errores de red son el resultado de problemas de conectividad entre el cliente y el servidor. Devuelven errores de bajo nivel, como excepciones de socket o tiempo de espera. Por ejemplo, el cliente puede haber excedido el tiempo de espera tratando de leer los servidores de Stripe o una interrupción prematura de la conexión puede haber impedido que llegue la respuesta de la API. Aunque un error de red parece que se solucionará correctamente después de solucionar los problemas de conectividad, a veces hay otro tipo de error oculto en el problema de comunicación.

En este tipo de errores, es donde se ve más claramente el valor de las claves de idempotencia y los reintentos de solicitud. Cuando surgen problemas de comunicación intermitente, los clientes suelen quedarse sin saber si el servidor ha recibido o no la solicitud. Para obtener una respuesta definitiva, deben reintentar esas solicitudes con las mismas claves de idempotencia y los mismos parámetros hasta recibir alguna respuesta del servidor. El envío de la misma idempotencia con diferentes parámetros produce un error que indica que la nueva solicitud no coincide con la original.

La mayoría de las bibliotecas de clientes pueden generar claves de idempotencia y solicitudes de reintentos automáticamente, pero para que lo hagan es necesario configurarlas. Realizan su primer reintento rápidamente después del primer error y los reintentos posteriores conforme a un calendario de retroceso exponencial, con la premisa de que un solo error suele ser una ocurrencia aleatoria y que un patrón de errores repetidos probablemente representa un problema crónico.

Seleccionar un idioma
.NET



StripeConfiguration.MaxNetworkRetries = 2;
Errores del servidor
Los errores del servidor se deben a un problema con los servidores de Stripe. Devuelven una respuesta HTTP con un código de error 5xx. Estos errores son los más difíciles de gestionar y trabajamos para que sean lo menos frecuentes posible, pero una buena integración los maneja cuando surgen.

Como ocurre con los errores de usuario, la capa de idempotencia almacena el resultado de las mutaciones POST que generan errores del servidor (específicamente los errores 500 que son errores internos del servidor), de manera que hacer reintentos con la misma clave de idempotencia suele arrojar el mismo resultado. El cliente puede reintentar la solicitud con una nueva clave de idempotencia, pero no lo aconsejamos porque la clave original puede haber producido efectos secundarios.

Debes tratar el resultado de una solicitud 500 como indeterminado. El momento más probable para observar uno es durante un incidente de producción y, en general, durante la corrección de dicho incidente. Los ingenieros de Stripe examinan las peticiones fallidas y tratan de conciliar adecuadamente los resultados de cualquier mutación que dé lugar a 500. Si bien la respuesta almacenada en caché de idempotencia a esas solicitudes no cambiará, intentaremos activar webhooks para cualquier objeto nuevo creado como parte de la conciliación de Stripe. La naturaleza exacta de cualquier cambio retroactivo en el sistema depende en gran medida del tipo de solicitud. Por ejemplo, si la creación de un cargo devuelve un error 500, pero detectamos que la información se ha enviado a una red de pagos, intentaremos recuperarlo y continuar el proceso. Si no, intentaremos revertirlo. Si esto no resuelve el problema, es posible que sigas viendo solicitudes con un error 500 que producen efectos secundarios visibles para el usuario.

Precaución
El resultado de las solicitudes que devuelven errores 500 debe tratarse como error indeterminado. Aunque Stripe trata de conciliar su estado parcial de la mejor manera posible y activa webhooks para los objetos nuevos que se crean, no se garantizan resultados ideales.

Para permitir que tu integración maneje el rango más amplio de 500, configura controladores de webhooks para recibir objetos de eventos que nunca recibes en las respuestas normales de la API. Una técnica para establecer referencias cruzadas de estos nuevos objetos con los datos del estado local de una integración consiste en enviar un identificador local con los metadatos al crear nuevos recursos con la API. Ese identificador aparece en el campo de metadatos de un objeto que sale a través de un webhook, incluso si el webhook se genera más tarde como parte de la conciliación.

Idempotencia
La idempotencia es un principio de diseño de API web definido como la capacidad de aplicar la misma operación varias veces sin cambiar el resultado más allá del primer intento. De este modo, es seguro reintentar las peticiones de API en algunas situaciones, en particular, cuando la primera petición no obtiene respuesta debido a un error de la red. Debido a que es de esperar una cierta cantidad de errores intermitentes, los clientes necesitan una forma de conciliar las peticiones fallidas con un servidor, y la idempotencia proporciona un mecanismo para ello.

La mayoría de las bibliotecas de clientes pueden generar claves de idempotencia y solicitudes de reintentos automáticamente, pero es necesario configurarlo. Para tener un control más detallado de los reintentos, genera claves de idempotencia y escribe tu propia lógica para los reintentos.

Solicitudes GET y DELETE
La API de Stripe garantiza la idempotencia de las solicitudes GET y DELETE, por lo que siempre es seguro volver a intentarlas.

Solicitudes POST
Incluir una clave de idempotencia hace que las solicitudes POST sean idempotentes, lo que obliga a la API a llevar los registros necesarios para evitar operaciones duplicadas. Los clientes pueden reintentar de forma segura las solicitudes que incluyan una clave de idempotencia siempre que la segunda solicitud se produzca en un plazo de 24 horas desde la recepción de la clave por primera vez (las claves caducan fuera del sistema después de 24 horas). Por ejemplo, si una solicitud para crear un objeto no responde debido a un error de conexión de red, el cliente puede volver a intentar la solicitud con la misma clave de idempotencia para garantizar que no se cree más de un objeto.

Cómo enviar claves de idempotencia
Las claves de idempotencia se envían en el encabezado Idempotency-Key. Úsalas para todas las solicitudes POST a la API de Stripe. La mayoría de las bibliotecas oficiales de clientes pueden enviarlas automáticamente, siempre y cuando estén configuradas para enviar reintentos.

Si decides enviar claves de idempotencia manualmente, asegúrate de que los tokens utilizados sean lo suficientemente únicos como para identificar sin ambigüedades una determinada operación dentro de tu cuenta durante las últimas 24 horas, como mínimo. Hay dos estrategias comunes para generar claves de idempotencia:

Usa un algoritmo que genere un token con suficiente aleatoriedad, como UUID v4.
Deriva la clave de un objeto asociado a un usuario, como el ID de un carrito de la compra. Esto proporciona una forma relativamente directa de protegerse contra los envíos duplicados.
Para identificar una respuesta ya ejecutada que se está reproduciendo desde el servidor, busca el encabezado Idempotent-Replayed: true.

El encabezado Stripe-Should-Retry
Una biblioteca de cliente no siempre puede determinar con certeza si debe hacer reintentos basándose únicamente en un código de estado o en el contenido del cuerpo de la respuesta. La API responde con el encabezado Stripe-Should-Retry cuando tiene información adicional de que se puede intentar de nuevo la solicitud.

Si Stripe-Should-Retry está establecido en true, el cliente debe reintentar la solicitud. Los clientes deberán esperar un poco (probablemente en función del calendario de retroceso exponencial) antes de hacer la siguiente solicitud para no sobrecargar a la API.
Si Stripe-Should-Retry está establecido en false, el cliente no debe reintentar la solicitud porque no tendrá un efecto adicional.
Si Stripe-Should-Retry no está definido en la respuesta, la API no puede determinar si se puede o no reintentar la solicitud. Los clientes deben recurrir a otras propiedades de la respuesta (como el código de estado) para tomar una decisión.
Los mecanismos de reintentos creados en las bibliotecas de cliente de Stripe respetan el encabezado Stripe-Should-Retry automáticamente. Si usas alguno de ellos, no es necesario que lo gestiones manualmente.

Referencia del código de estado HTTP
200	Aceptar	Todo ha funcionado como se esperaba.
400	Petición incorrecta	La petición no se ha podido aceptar (suele ocurrir porque falta un parámetro obligatorio).
401	No autorizado	No se ha proporcionado ninguna clave de API válida.
402	Ha fallado la petición	Los parámetros eran válidos, pero la petición ha fallado.
403	Prohibido	La clave de API no tiene los permisos para hacer la petición.
409	Conflicto	La petición entra en conflicto con otra petición (quizás por el uso de la misma clave idempotente).
424	Ha fallado la dependencia externa	No se ha podido completar la petición por un error en una dependencia externa a Stripe.
429	Demasiadas peticiones	Demasiadas peticiones llegan a la API demasiado rápido. Recomendamos una reducción exponencial de tus solicitudes.
500, 502, 503, 504	Errores del servidor

Value	Locale	Elements	Checkout
auto	Stripe detects the locale of the browser	✔	✔
ar	Arabic	✔	
bg	Bulgarian (Bulgaria)	✔	✔
cs	Czech (Czech Republic)	✔	✔
da	Danish (Denmark)	✔	✔
de	German (Germany)	✔	✔
el	Greek (Greece)	✔	✔
en	English	✔	✔
en-GB	English (United Kingdom)	✔	✔
es	Spanish (Spain)	✔	✔
es-419	Spanish (Latin America)	✔	✔
et	Estonian (Estonia)	✔	✔
fi	Finnish (Finland)	✔	✔
fil	Filipino (Philipines)	✔	✔
fr	French (France)	✔	✔
fr-CA	French (Canada)	✔	✔
he	Hebrew (Israel)	✔	
hr	Croatian (Croatia)	✔	✔
hu	Hungarian (Hungary)	✔	✔
id	Indonesian (Indonesia)	✔	✔
it	Italian (Italy)	✔	✔
ja	Japanese (Japan)	✔	✔
ko	Korean (Korea)	✔	✔
lt	Lithuanian (Lithuania)	✔	✔
lv	Latvian (Latvia)	✔	✔
ms	Malay (Malaysia)	✔	✔
mt	Maltese (Malta)	✔	✔
nb	Norwegian Bokmål	✔	✔
nl	Dutch (Netherlands)	✔	✔
pl	Polish (Poland)	✔	✔
pt-BR	Portuguese (Brazil)	✔	✔
pt	Portuguese (Brazil)	✔	✔
ro	Romanian (Romania)	✔	✔
ru	Russian (Russia)	✔	✔
sk	Slovak (Slovakia)	✔	✔
sl	Slovenian (Slovenia)	✔	✔
sv	Swedish (Sweden)	✔	✔
th	Thai (Thailand)	✔	✔
tr	Turkish (Turkey)	✔	✔
vi	Vietnamese (Vietnam)	✔	✔
zh	Chinese Simplified (China)	✔	✔
zh-HK	Chinese Traditional (Hong Kong)	✔	✔
zh-TW	Chinese Traditional (Taiwan)	✔	✔

### create an stripe instance with a locale :

var stripe = Stripe('pk_test_TYooMQauvdEDq54NiTphI7jx', {
  locale: 'fr'
});