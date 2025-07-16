
// Artifact generation API for Vite React app
// This provides the same functionality as a Next.js API route but for client-side use

export interface GenerateArtifactRequest {
  prompt: string;
  category?: 'docs' | 'images' | 'games' | 'data' | 'webs';
  type?: string;
}

export interface GenerateArtifactResponse {
  id: string;
  title: string;
  description: string;
  type: string;
  category: 'docs' | 'images' | 'games' | 'data' | 'webs';
  content: string;
  createdAt: Date;
}

export async function generateArtifactFromPrompt(
  prompt: string,
  category?: 'docs' | 'images' | 'games' | 'data' | 'webs',
  type?: string
): Promise<GenerateArtifactResponse> {
  try {
    // Detect category and type if not provided
    const finalCategory = category || detectCategory(prompt);
    const finalType = type || detectType(prompt, finalCategory);

    // Mock OpenAI call - replace with actual OpenAI integration
    const artifact = await generateArtifact(prompt, finalCategory, finalType);

    return artifact;
  } catch (error) {
    console.error('Error generating artifact:', error);
    throw new Error('Failed to generate artifact');
  }
}

function detectCategory(prompt: string): 'docs' | 'images' | 'games' | 'data' | 'webs' {
  const lowerPrompt = prompt.toLowerCase();
  
  // Web keywords
  if (lowerPrompt.includes('website') || lowerPrompt.includes('web app') || lowerPrompt.includes('landing') || 
      lowerPrompt.includes('portfolio') || lowerPrompt.includes('homepage')) {
    return 'webs';
  }
  
  // Game keywords
  if (lowerPrompt.includes('game') || lowerPrompt.includes('puzzle') || lowerPrompt.includes('rpg') ||
      lowerPrompt.includes('arcade') || lowerPrompt.includes('flashcard') || lowerPrompt.includes('retro')) {
    return 'games';
  }
  
  // Data keywords
  if (lowerPrompt.includes('chart') || lowerPrompt.includes('graph') || lowerPrompt.includes('data') || 
      lowerPrompt.includes('table') || lowerPrompt.includes('visualization') || lowerPrompt.includes('analytics')) {
    return 'data';
  }
  
  // Image keywords
  if (lowerPrompt.includes('diagram') || lowerPrompt.includes('sketch') || lowerPrompt.includes('photo') || 
      lowerPrompt.includes('svg') || lowerPrompt.includes('visual') || lowerPrompt.includes('graphic')) {
    return 'images';
  }
  
  // Default to docs
  return 'docs';
}

function detectType(prompt: string, category: string): string {
  const lowerPrompt = prompt.toLowerCase();
  
  switch (category) {
    case 'docs':
      if (lowerPrompt.includes('slide') || lowerPrompt.includes('presentation')) return 'slides';
      if (lowerPrompt.includes('pdf')) return 'pdf';
      return 'doc';
      
    case 'images':
      if (lowerPrompt.includes('diagram') || lowerPrompt.includes('flowchart')) return 'diagram';
      if (lowerPrompt.includes('sketch') || lowerPrompt.includes('drawing')) return 'sketch';
      return 'photo';
      
    case 'games':
      if (lowerPrompt.includes('puzzle') || lowerPrompt.includes('sudoku') || lowerPrompt.includes('maze')) return 'puzzles';
      if (lowerPrompt.includes('rpg') || lowerPrompt.includes('adventure') || lowerPrompt.includes('story')) return 'rpg';
      if (lowerPrompt.includes('flashcard') || lowerPrompt.includes('quiz') || lowerPrompt.includes('learn')) return 'flashcards';
      if (lowerPrompt.includes('retro') || lowerPrompt.includes('classic') || lowerPrompt.includes('8-bit')) return 'retro';
      return 'arcade';
      
    case 'data':
      if (lowerPrompt.includes('table') || lowerPrompt.includes('spreadsheet')) return 'table';
      if (lowerPrompt.includes('diagram') || lowerPrompt.includes('flow')) return 'diagram';
      return 'graph';
      
    case 'webs':
      if (lowerPrompt.includes('single page') || lowerPrompt.includes('spa') || lowerPrompt.includes('app')) return 'spa';
      if (lowerPrompt.includes('landing') || lowerPrompt.includes('marketing')) return 'landing';
      return 'personal';
      
    default:
      return 'doc';
  }
}

async function generateArtifact(prompt: string, category: 'docs' | 'images' | 'games' | 'data' | 'webs', type: string): Promise<GenerateArtifactResponse> {
  // This would integrate with your existing OpenAI setup
  // For now, we'll create mock content
  
  // System prompts for future OpenAI integration
  /*
  const systemPrompts = {
    // DOCS
    'docs-doc': `Create professional documents with rich formatting, headers, lists, and clean typography. Use Markdown format.`,
    'docs-slides': `Create presentation slides with clean layouts. Use HTML with embedded CSS for slide presentation format.`,
    'docs-pdf': `Create print-ready document layouts with professional formatting. Use HTML with embedded CSS for PDF-style layout.`,
    
    // IMAGES
    'images-diagram': `Create technical diagrams using SVG. Include flowcharts, system diagrams, or process flows with clear connections and labels.`,
    'images-sketch': `Create hand-drawn style illustrations using SVG with organic lines, sketch-like appearance, and artistic flair.`,
    'images-photo': `Create realistic image compositions using SVG or CSS art with detailed styling and photographic qualities.`,
    
    // GAMES
    'games-puzzles': `Create mind-bending puzzle games like Sudoku, word puzzles, or logic games with interactive solving mechanics.`,
    'games-rpg': `Create simple RPG-style games with character stats, inventory, story elements, and turn-based mechanics.`,
    'games-flashcards': `Create interactive learning flashcards with flip animations, progress tracking, and spaced repetition.`,
    'games-arcade': `Create classic arcade games like Snake, Pong, or Breakout with score systems and smooth gameplay.`,
    'games-retro': `Create nostalgic 8-bit style games with pixel art aesthetics, chiptune-inspired design, and retro mechanics.`,
    
    // DATA
    'data-table': `Create interactive data tables with sorting, filtering, search functionality, and clean presentation of structured data.`,
    'data-graph': `Create interactive charts and graphs using HTML5 Canvas or SVG with animations and hover effects.`,
    'data-diagram': `Create data flow diagrams, entity relationship diagrams, or process maps showing data relationships.`,
    
    // WEBS
    'webs-spa': `Create complete single-page web applications with interactive functionality, routing simulation, and modern UI components.`,
    'webs-landing': `Create compelling landing pages with hero sections, features, testimonials, and call-to-action buttons.`,
    'webs-personal': `Create personal portfolio or profile pages with about sections, skills, projects, and contact information.`
  };
  */

  // Mock content generation - replace with actual OpenAI API call
  const content = await generateMockContent(prompt, category, type);
  
  return {
    id: generateId(),
    title: generateTitle(prompt, type),
    description: prompt,
    type,
    category: category,
    content: content,
    createdAt: new Date(),
  };
}

async function generateMockContent(prompt: string, category: string, type: string): Promise<string> {
  // Mock content based on type - replace with actual OpenAI integration
  
  if (type === 'game' || type === 'arcade') {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Snake Game</title>
    <style>
        body { margin: 0; padding: 20px; background: #111; color: white; font-family: Arial, sans-serif; display: flex; flex-direction: column; align-items: center; }
        canvas { border: 2px solid #fff; background: #000; }
        .score { font-size: 24px; margin: 20px 0; }
        .controls { margin: 10px 0; }
    </style>
</head>
<body>
    <h1>Snake Game</h1>
    <div class="score">Score: <span id="score">0</span></div>
    <canvas id="gameCanvas" width="400" height="400"></canvas>
    <div class="controls">
        <p>Use WASD or Arrow Keys to move</p>
        <button onclick="startGame()">Start Game</button>
    </div>
    
    <script>
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const scoreElement = document.getElementById('score');
        
        let snake = [{x: 200, y: 200}];
        let direction = {x: 0, y: 0};
        let food = {x: 0, y: 0};
        let score = 0;
        let gameRunning = false;
        
        function generateFood() {
            food = {
                x: Math.floor(Math.random() * 20) * 20,
                y: Math.floor(Math.random() * 20) * 20
            };
        }
        
        function draw() {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = '#0f0';
            snake.forEach(segment => {
                ctx.fillRect(segment.x, segment.y, 18, 18);
            });
            
            ctx.fillStyle = '#f00';
            ctx.fillRect(food.x, food.y, 18, 18);
        }
        
        function update() {
            if (!gameRunning) return;
            
            const head = {x: snake[0].x + direction.x, y: snake[0].y + direction.y};
            
            if (head.x < 0 || head.x >= 400 || head.y < 0 || head.y >= 400 || 
                snake.some(segment => segment.x === head.x && segment.y === head.y)) {
                gameRunning = false;
                alert('Game Over! Score: ' + score);
                return;
            }
            
            snake.unshift(head);
            
            if (head.x === food.x && head.y === food.y) {
                score += 10;
                scoreElement.textContent = score;
                generateFood();
            } else {
                snake.pop();
            }
            
            draw();
        }
        
        function startGame() {
            snake = [{x: 200, y: 200}];
            direction = {x: 20, y: 0};
            score = 0;
            scoreElement.textContent = score;
            gameRunning = true;
            generateFood();
            draw();
        }
        
        document.addEventListener('keydown', (e) => {
            if (!gameRunning) return;
            
            switch(e.key.toLowerCase()) {
                case 'w':
                case 'arrowup':
                    if (direction.y === 0) direction = {x: 0, y: -20};
                    break;
                case 's':
                case 'arrowdown':
                    if (direction.y === 0) direction = {x: 0, y: 20};
                    break;
                case 'a':
                case 'arrowleft':
                    if (direction.x === 0) direction = {x: -20, y: 0};
                    break;
                case 'd':
                case 'arrowright':
                    if (direction.x === 0) direction = {x: 20, y: 0};
                    break;
            }
        });
        
        setInterval(update, 150);
        generateFood();
        draw();
    </script>
</body>
</html>`;
  }
  
  if (type === 'landing') {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI-Powered Landing Page</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1rem 0; }
        nav { display: flex; justify-content: space-between; align-items: center; }
        .logo { font-size: 1.5rem; font-weight: bold; }
        .nav-links { display: flex; list-style: none; gap: 2rem; }
        .nav-links a { color: white; text-decoration: none; }
        .hero { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 5rem 0; text-align: center; }
        .hero h1 { font-size: 3rem; margin-bottom: 1rem; }
        .hero p { font-size: 1.2rem; margin-bottom: 2rem; max-width: 600px; margin-left: auto; margin-right: auto; }
        .cta-button { background: #ff6b6b; color: white; padding: 1rem 2rem; border: none; border-radius: 5px; font-size: 1.1rem; cursor: pointer; text-decoration: none; display: inline-block; }
        .features { padding: 4rem 0; }
        .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; }
        .feature { text-align: center; padding: 2rem; }
        .feature-icon { font-size: 3rem; margin-bottom: 1rem; }
        .footer { background: #333; color: white; text-align: center; padding: 2rem 0; }
    </style>
</head>
<body>
    <header>
        <div class="container">
            <nav>
                <div class="logo">AI Solutions</div>
                <ul class="nav-links">
                    <li><a href="#features">Features</a></li>
                    <li><a href="#about">About</a></li>
                    <li><a href="#contact">Contact</a></li>
                </ul>
            </nav>
        </div>
    </header>
    
    <section class="hero">
        <div class="container">
            <h1>Transform Your Business with AI</h1>
            <p>Discover the power of artificial intelligence to automate processes, gain insights, and drive growth for your business.</p>
            <a href="#" class="cta-button">Get Started Today</a>
        </div>
    </section>
    
    <section class="features" id="features">
        <div class="container">
            <h2 style="text-align: center; margin-bottom: 3rem;">Why Choose Our AI Solutions?</h2>
            <div class="features-grid">
                <div class="feature">
                    <div class="feature-icon">🚀</div>
                    <h3>Fast Implementation</h3>
                    <p>Get up and running in minutes, not months. Our AI solutions integrate seamlessly with your existing workflows.</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">🎯</div>
                    <h3>Precision Accuracy</h3>
                    <p>State-of-the-art machine learning models deliver results with industry-leading accuracy and reliability.</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">📈</div>
                    <h3>Scalable Growth</h3>
                    <p>Our solutions grow with your business, handling increased demand without compromising performance.</p>
                </div>
            </div>
        </div>
    </section>
    
    <footer class="footer">
        <div class="container">
            <p>&copy; 2024 AI Solutions. All rights reserved.</p>
        </div>
    </footer>
</body>
</html>`;
  }
  
  if (type === 'diagram') {
    return `<svg width="600" height="400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="7" 
     refX="10" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="#333" />
    </marker>
  </defs>
  
  <!-- Boxes -->
  <rect x="50" y="50" width="120" height="60" fill="#e3f2fd" stroke="#1976d2" stroke-width="2" rx="5"/>
  <text x="110" y="85" text-anchor="middle" font-family="Arial" font-size="14" fill="#333">User Input</text>
  
  <rect x="250" y="50" width="120" height="60" fill="#f3e5f5" stroke="#7b1fa2" stroke-width="2" rx="5"/>
  <text x="310" y="85" text-anchor="middle" font-family="Arial" font-size="14" fill="#333">Processing</text>
  
  <rect x="450" y="50" width="120" height="60" fill="#e8f5e8" stroke="#388e3c" stroke-width="2" rx="5"/>
  <text x="510" y="85" text-anchor="middle" font-family="Arial" font-size="14" fill="#333">Output</text>
  
  <rect x="150" y="200" width="120" height="60" fill="#fff3e0" stroke="#f57c00" stroke-width="2" rx="5"/>
  <text x="210" y="235" text-anchor="middle" font-family="Arial" font-size="14" fill="#333">Validation</text>
  
  <rect x="350" y="200" width="120" height="60" fill="#fce4ec" stroke="#c2185b" stroke-width="2" rx="5"/>
  <text x="410" y="235" text-anchor="middle" font-family="Arial" font-size="14" fill="#333">Storage</text>
  
  <!-- Arrows -->
  <line x1="170" y1="80" x2="250" y2="80" stroke="#333" stroke-width="2" marker-end="url(#arrowhead)"/>
  <line x1="370" y1="80" x2="450" y2="80" stroke="#333" stroke-width="2" marker-end="url(#arrowhead)"/>
  <line x1="310" y1="110" x2="210" y2="200" stroke="#333" stroke-width="2" marker-end="url(#arrowhead)"/>
  <line x1="270" y1="230" x2="350" y2="230" stroke="#333" stroke-width="2" marker-end="url(#arrowhead)"/>
  
  <!-- Title -->
  <text x="300" y="30" text-anchor="middle" font-family="Arial" font-size="18" font-weight="bold" fill="#333">System Flow Diagram</text>
</svg>`;
  }
  
  // Default content for other types
  return `# ${prompt}

This is a mock artifact generated for the "${type}" type in the "${category}" category.

## Features
- Interactive content
- Modern design
- Responsive layout
- AI-generated content

*This would be replaced with actual OpenAI-generated content in production.*`;
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

function generateTitle(prompt: string, type: string): string {
  const words = prompt.split(' ').slice(0, 6).join(' ');
  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
  return `${typeLabel}: ${words}`;
}
