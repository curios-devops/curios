import { useState } from 'react'
import { supabase } from '../lib/supabase'

function dataURLToBlob(dataurl: string) {
  const arr = dataurl.split(',')
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new Blob([u8arr], { type: mime })
}

export default function ImageTest() {
  const [logs, setLogs] = useState<string[]>([])
  const append = (line: string) => setLogs(l => [...l, line])

  async function handleUpload() {
    append('Generating test image...')
    // create a small 100x100 red PNG
    const canvas = document.createElement('canvas')
    canvas.width = 100
    canvas.height = 100
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      append('Failed to get canvas context')
      return
    }
    ctx.fillStyle = '#cc0000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#ffffff'
    ctx.font = '14px sans-serif'
    ctx.fillText('test', 10, 55)

    const dataUrl = canvas.toDataURL('image/png')
    const blob = dataURLToBlob(dataUrl)

    append('Converting to Blob — size: ' + blob.size + ' bytes')

    const timestamp = Date.now()
    const fileName = `test-upload-${timestamp}.png`
    const filePath = `uploads/${fileName}`

    append('Calling supabase.storage.from("reverse-image-searches").upload( ' + filePath + ' )')

    try {
      // Use the browser File/Blob upload API
      const { data, error } = await supabase.storage
        .from('reverse-image-searches')
        .upload(filePath, blob, { contentType: 'image/png', cacheControl: '3600', upsert: false })

      if (error) {
        append('Supabase SDK returned error: ' + JSON.stringify(error))
      } else {
        append('Upload success, data: ' + JSON.stringify(data))
        // Attempt to get public URL
          try {
            const { data: urlData } = supabase.storage
              .from('reverse-image-searches')
              .getPublicUrl(filePath)
            if (!urlData?.publicUrl) append('getPublicUrl returned no publicUrl: ' + JSON.stringify(urlData))
            else append('Public URL: ' + urlData.publicUrl)
          } catch (e) {
            append('getPublicUrl threw: ' + String(e))
          }
      }
    } catch (e: any) {
      append('Upload threw exception: ' + (e?.message || String(e)))
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Image upload test</h1>
      <p>Bucket: <code>reverse-image-searches</code></p>
      <button onClick={handleUpload}>Upload generated PNG</button>
      <div style={{ marginTop: 16 }}>
        <h3>Logs</h3>
        <div style={{ whiteSpace: 'pre-wrap', background: '#f7f7f7', padding: 12 }}>
          {logs.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      </div>
    </div>
  )
}
