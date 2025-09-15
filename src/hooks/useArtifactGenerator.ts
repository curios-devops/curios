import { useState } from 'react';
import { UIArtifact, ArtifactGenerationRequest } from '../commonApp/types/index';

export const useArtifactGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New: allow subscribing to real-time steps and subtasks
  const generateArtifact = async (
    request: ArtifactGenerationRequest,
    onStep?: (step: string, subtaskList?: string[], currentSubtask?: string) => void
  ): Promise<UIArtifact | null> => {
    setIsGenerating(true);
    setError(null);

    try {
      // Simulate real-time agent workflow for document generation
      if (onStep) onStep('Analyzing your request...');
      await delay(600);
      if (onStep) onStep('Creating a todo list for document generation.', [
        'Research Topic',
        'Outline and Generate Document',
        'Deliver Document',
      ], 'Research Topic');
      await delay(600);
      if (onStep) onStep('Researching topic...', [
        'Research Topic',
        'Outline and Generate Document',
        'Deliver Document',
      ], 'Research Topic');
      await delay(800);
      if (onStep) onStep('Creating the document outline.', [
        'Research Topic',
        'Outline and Generate Document',
        'Deliver Document',
      ], 'Outline and Generate Document');
      await delay(600);
      if (onStep) onStep('Writing the introduction section.', [
        'Research Topic',
        'Outline and Generate Document',
        'Deliver Document',
      ], 'Outline and Generate Document');
      await delay(600);
      if (onStep) onStep('Writing about early life and education.', [
        'Research Topic',
        'Outline and Generate Document',
        'Deliver Document',
      ], 'Outline and Generate Document');
      await delay(600);
      if (onStep) onStep('Writing about Zip2 and PayPal.', [
        'Research Topic',
        'Outline and Generate Document',
        'Deliver Document',
      ], 'Outline and Generate Document');
      await delay(600);
      if (onStep) onStep('Writing about SpaceX.', [
        'Research Topic',
        'Outline and Generate Document',
        'Deliver Document',
      ], 'Outline and Generate Document');
      await delay(600);
      if (onStep) onStep('Writing about Tesla.', [
        'Research Topic',
        'Outline and Generate Document',
        'Deliver Document',
      ], 'Outline and Generate Document');
      await delay(600);
      if (onStep) onStep('Writing about other ventures (Neuralink, The Boring Company, X, xAI).', [
        'Research Topic',
        'Outline and Generate Document',
        'Deliver Document',
      ], 'Outline and Generate Document');
      await delay(600);
      if (onStep) onStep('Writing about achievements and impact.', [
        'Research Topic',
        'Outline and Generate Document',
        'Deliver Document',
      ], 'Outline and Generate Document');
      await delay(600);
      if (onStep) onStep("Continuing the 'Achievements and Impact' section.", [
        'Research Topic',
        'Outline and Generate Document',
        'Deliver Document',
      ], 'Outline and Generate Document');
      await delay(600);
      if (onStep) onStep('Writing the conclusion section.', [
        'Research Topic',
        'Outline and Generate Document',
        'Deliver Document',
      ], 'Outline and Generate Document');
      await delay(600);
      if (onStep) onStep('Converting the Markdown document to PDF.', [
        'Research Topic',
        'Outline and Generate Document',
        'Deliver Document',
      ], 'Deliver Document');
      await delay(800);
      if (onStep) onStep('Here is the comprehensive document about Elon Musk.', [
        'Research Topic',
        'Outline and Generate Document',
        'Deliver Document',
      ], 'Deliver Document');
      // Use mock generation for now
      const artifact = await generateMockArtifact(request);
      return artifact;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateArtifact,
    isGenerating,
    error,
  };
};

// Mock artifact generation function
async function generateMockArtifact(request: ArtifactGenerationRequest): Promise<Artifact> {
  const { prompt, category, type } = request;
  
  const detectedCategory = category || detectCategory(prompt);
  const detectedType = type || detectType(prompt, detectedCategory);
  
  const content = await generateMockContent(prompt, detectedCategory, detectedType);
  
  return {
    id: generateId(),
    title: generateTitle(prompt, detectedType),
    description: prompt,
    type: detectedType,
    category: detectedCategory,
    content,
    createdAt: new Date(),
  };
}

function detectCategory(prompt: string): 'docs' | 'images' | 'games' | 'data' | 'webs' {
  const lowerPrompt = prompt.toLowerCase();
  
  if (lowerPrompt.includes('website') || lowerPrompt.includes('web app') || lowerPrompt.includes('landing') || 
      lowerPrompt.includes('portfolio') || lowerPrompt.includes('homepage')) {
    return 'webs';
  }
  
  if (lowerPrompt.includes('game') || lowerPrompt.includes('puzzle') || lowerPrompt.includes('rpg') ||
      lowerPrompt.includes('arcade') || lowerPrompt.includes('flashcard') || lowerPrompt.includes('retro')) {
    return 'games';
  }
  
  if (lowerPrompt.includes('chart') || lowerPrompt.includes('graph') || lowerPrompt.includes('data') || 
      lowerPrompt.includes('table') || lowerPrompt.includes('visualization') || lowerPrompt.includes('analytics')) {
    return 'data';
  }
  
  if (lowerPrompt.includes('diagram') || lowerPrompt.includes('sketch') || lowerPrompt.includes('photo') || 
      lowerPrompt.includes('svg') || lowerPrompt.includes('visual') || lowerPrompt.includes('graphic')) {
    return 'images';
  }
  
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

async function generateMockContent(prompt: string, category: string, type: string): Promise<string> {
  if (type === 'arcade' || type === 'game') {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Snake Game - ${prompt}</title>
    <style>
        body { margin: 0; padding: 20px; background: #111; color: white; font-family: Arial, sans-serif; display: flex; flex-direction: column; align-items: center; }
        canvas { border: 2px solid #fff; background: #000; }
        .score { font-size: 24px; margin: 20px 0; }
        .controls { margin: 10px 0; text-align: center; }
        button { background: #4CAF50; color: white; border: none; padding: 10px 20px; font-size: 16px; cursor: pointer; border-radius: 5px; }
        button:hover { background: #45a049; }
    </style>
</head>
<body>
    <h1>🐍 Snake Game</h1>
    <div class="score">Score: <span id="score">0</span></div>
    <canvas id="gameCanvas" width="400" height="400"></canvas>
    <div class="controls">
        <p>Use WASD or Arrow Keys to move</p>
        <button onclick="startGame()">Start Game</button>
        <button onclick="pauseGame()">Pause</button>
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
        let gameInterval;
        
        function generateFood() {
            food = {
                x: Math.floor(Math.random() * 20) * 20,
                y: Math.floor(Math.random() * 20) * 20
            };
        }
        
        function draw() {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw snake
            ctx.fillStyle = '#0f0';
            snake.forEach((segment, index) => {
                ctx.fillRect(segment.x + 1, segment.y + 1, 18, 18);
                if (index === 0) {
                    ctx.fillStyle = '#0a0'; // Head slightly different
                }
            });
            
            // Draw food
            ctx.fillStyle = '#f00';
            ctx.fillRect(food.x + 1, food.y + 1, 18, 18);
        }
        
        function update() {
            if (!gameRunning) return;
            
            const head = {x: snake[0].x + direction.x, y: snake[0].y + direction.y};
            
            // Check collisions
            if (head.x < 0 || head.x >= 400 || head.y < 0 || head.y >= 400 || 
                snake.some(segment => segment.x === head.x && segment.y === head.y)) {
                gameRunning = false;
                clearInterval(gameInterval);
                alert('Game Over! Final Score: ' + score + '\\nClick Start Game to play again!');
                return;
            }
            
            snake.unshift(head);
            
            // Check if food eaten
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
            
            if (gameInterval) clearInterval(gameInterval);
            gameInterval = setInterval(update, 150);
        }
        
        function pauseGame() {
            gameRunning = !gameRunning;
            if (gameRunning && gameInterval) {
                gameInterval = setInterval(update, 150);
            } else {
                clearInterval(gameInterval);
            }
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
        
        generateFood();
        draw();
    </script>
</body>
</html>`;
  }

  if (type === 'landing' || type === 'personal') {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${prompt}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            color: #333; 
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        
        header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 1rem 0; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        nav { display: flex; justify-content: space-between; align-items: center; }
        .logo { font-size: 1.5rem; font-weight: bold; }
        .nav-links { 
            display: flex; 
            list-style: none; 
            gap: 2rem; 
        }
        .nav-links a { 
            color: white; 
            text-decoration: none; 
            transition: opacity 0.3s;
        }
        .nav-links a:hover { opacity: 0.8; }
        
        .hero { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 5rem 0; 
            text-align: center; 
        }
        .hero h1 { 
            font-size: 3rem; 
            margin-bottom: 1rem; 
            animation: fadeInUp 1s ease-out;
        }
        .hero p { 
            font-size: 1.2rem; 
            margin-bottom: 2rem; 
            max-width: 600px; 
            margin-left: auto; 
            margin-right: auto; 
            animation: fadeInUp 1s ease-out 0.2s both;
        }
        
        .cta-button { 
            background: #ff6b6b; 
            color: white; 
            padding: 1rem 2rem; 
            border: none; 
            border-radius: 50px; 
            font-size: 1.1rem; 
            cursor: pointer; 
            text-decoration: none; 
            display: inline-block; 
            transition: transform 0.3s, box-shadow 0.3s;
            animation: fadeInUp 1s ease-out 0.4s both;
        }
        .cta-button:hover { 
            transform: translateY(-2px); 
            box-shadow: 0 10px 20px rgba(255, 107, 107, 0.3);
        }
        
        .features { padding: 4rem 0; background: #f8f9fa; }
        .features h2 { text-align: center; margin-bottom: 3rem; font-size: 2.5rem; }
        .features-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
            gap: 2rem; 
        }
        .feature { 
            text-align: center; 
            padding: 2rem; 
            background: white; 
            border-radius: 10px; 
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            transition: transform 0.3s;
        }
        .feature:hover { transform: translateY(-5px); }
        .feature-icon { font-size: 3rem; margin-bottom: 1rem; }
        .feature h3 { margin-bottom: 1rem; color: #333; }
        
        .footer { 
            background: #333; 
            color: white; 
            text-align: center; 
            padding: 2rem 0; 
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        @media (max-width: 768px) {
            .hero h1 { font-size: 2rem; }
            .nav-links { display: none; }
        }
    </style>
</head>
<body>
    <header>
        <div class="container">
            <nav>
                <div class="logo">✨ AI Solutions</div>
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
            <a href="#features" class="cta-button">Get Started Today</a>
        </div>
    </section>
    
    <section class="features" id="features">
        <div class="container">
            <h2>Why Choose Our AI Solutions?</h2>
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
                <div class="feature">
                    <div class="feature-icon">🔒</div>
                    <h3>Secure & Private</h3>
                    <p>Enterprise-grade security ensures your data remains protected while you leverage AI capabilities.</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">💡</div>
                    <h3>Smart Insights</h3>
                    <p>Transform raw data into actionable insights with our advanced analytics and reporting tools.</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">🤝</div>
                    <h3>24/7 Support</h3>
                    <p>Our expert team is available around the clock to help you maximize your AI investment.</p>
                </div>
            </div>
        </div>
    </section>
    
    <footer class="footer">
        <div class="container">
            <p>&copy; 2024 AI Solutions. All rights reserved. | Built with AI-powered technology</p>
        </div>
    </footer>
    
    <script>
        // Smooth scrolling for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                document.querySelector(this.getAttribute('href')).scrollIntoView({
                    behavior: 'smooth'
                });
            });
        });
        
        // Simple animation on scroll
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        });
        
        document.querySelectorAll('.feature').forEach((el) => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'opacity 0.6s, transform 0.6s';
            observer.observe(el);
        });
    </script>
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
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#e3f2fd;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#bbdefb;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="600" height="400" fill="#f8f9fa"/>
  
  <!-- Title -->
  <text x="300" y="30" text-anchor="middle" font-family="Arial" font-size="18" font-weight="bold" fill="#333">
    ${prompt} - System Flow Diagram
  </text>
  
  <!-- Process Boxes -->
  <rect x="50" y="80" width="120" height="60" fill="url(#grad1)" stroke="#1976d2" stroke-width="2" rx="8"/>
  <text x="110" y="110" text-anchor="middle" font-family="Arial" font-size="12" font-weight="bold" fill="#333">User Input</text>
  
  <rect x="240" y="80" width="120" height="60" fill="#f3e5f5" stroke="#7b1fa2" stroke-width="2" rx="8"/>
  <text x="300" y="110" text-anchor="middle" font-family="Arial" font-size="12" font-weight="bold" fill="#333">Processing</text>
  
  <rect x="430" y="80" width="120" height="60" fill="#e8f5e8" stroke="#388e3c" stroke-width="2" rx="8"/>
  <text x="490" y="110" text-anchor="middle" font-family="Arial" font-size="12" font-weight="bold" fill="#333">Output</text>
  
  <!-- Decision Diamond -->
  <polygon points="300,200 350,230 300,260 250,230" fill="#fff3e0" stroke="#f57c00" stroke-width="2"/>
  <text x="300" y="235" text-anchor="middle" font-family="Arial" font-size="10" fill="#333">Validate?</text>
  
  <!-- Storage -->
  <rect x="100" y="320" width="120" height="60" fill="#fce4ec" stroke="#c2185b" stroke-width="2" rx="8"/>
  <text x="160" y="350" text-anchor="middle" font-family="Arial" font-size="12" font-weight="bold" fill="#333">Storage</text>
  
  <!-- Error Handling -->
  <rect x="380" y="320" width="120" height="60" fill="#ffebee" stroke="#d32f2f" stroke-width="2" rx="8"/>
  <text x="440" y="350" text-anchor="middle" font-family="Arial" font-size="12" font-weight="bold" fill="#333">Error Handler</text>
  
  <!-- Arrows -->
  <line x1="170" y1="110" x2="240" y2="110" stroke="#333" stroke-width="2" marker-end="url(#arrowhead)"/>
  <line x1="360" y1="110" x2="430" y2="110" stroke="#333" stroke-width="2" marker-end="url(#arrowhead)"/>
  <line x1="490" y1="140" x2="490" y2="180" stroke="#333" stroke-width="2"/>
  <line x1="490" y1="180" x2="350" y2="180" stroke="#333" stroke-width="2"/>
  <line x1="350" y1="180" x2="350" y2="200" stroke="#333" stroke-width="2" marker-end="url(#arrowhead)"/>
  
  <!-- Decision branches -->
  <line x1="250" y1="230" x2="170" y2="230" stroke="#388e3c" stroke-width="2"/>
  <line x1="170" y1="230" x2="170" y2="320" stroke="#388e3c" stroke-width="2" marker-end="url(#arrowhead)"/>
  <text x="210" y="225" font-family="Arial" font-size="10" fill="#388e3c">Yes</text>
  
  <line x1="350" y1="230" x2="420" y2="230" stroke="#d32f2f" stroke-width="2"/>
  <line x1="420" y1="230" x2="420" y2="320" stroke="#d32f2f" stroke-width="2" marker-end="url(#arrowhead)"/>
  <text x="385" y="225" font-family="Arial" font-size="10" fill="#d32f2f">No</text>
  
  <!-- Icons -->
  <circle cx="80" cy="100" r="8" fill="#2196f3"/>
  <text x="80" y="105" text-anchor="middle" font-family="Arial" font-size="12" fill="white">👤</text>
  
  <circle cx="270" cy="100" r="8" fill="#9c27b0"/>
  <text x="270" y="105" text-anchor="middle" font-family="Arial" font-size="12" fill="white">⚙️</text>
  
  <circle cx="460" cy="100" r="8" fill="#4caf50"/>
  <text x="460" y="105" text-anchor="middle" font-family="Arial" font-size="12" fill="white">📊</text>
</svg>`;
  }

  if (type === 'table') {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Interactive Data Table - ${prompt}</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background: #f8f9fa; 
        }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { color: #333; text-align: center; margin-bottom: 2rem; }
        
        .search-container { 
            margin-bottom: 1rem; 
            display: flex; 
            gap: 1rem; 
            align-items: center; 
        }
        .search-input { 
            padding: 0.5rem; 
            border: 1px solid #ddd; 
            border-radius: 4px; 
            flex: 1; 
        }
        
        .table-container { 
            background: white; 
            border-radius: 8px; 
            overflow: hidden; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
        }
        
        table { 
            width: 100%; 
            border-collapse: collapse; 
        }
        
        th, td { 
            padding: 12px; 
            text-align: left; 
            border-bottom: 1px solid #eee; 
        }
        
        th { 
            background: #f8f9fa; 
            font-weight: 600; 
            color: #333; 
            cursor: pointer; 
            user-select: none; 
            position: relative;
        }
        
        th:hover { background: #e9ecef; }
        
        th.sortable::after { 
            content: ' ↕️'; 
            opacity: 0.5; 
        }
        
        th.sort-asc::after { 
            content: ' ↑'; 
            opacity: 1; 
        }
        
        th.sort-desc::after { 
            content: ' ↓'; 
            opacity: 1; 
        }
        
        tr:hover { background: #f8f9fa; }
        
        .status { 
            padding: 4px 8px; 
            border-radius: 12px; 
            font-size: 0.8rem; 
            font-weight: 500; 
        }
        
        .status.active { background: #d4edda; color: #155724; }
        .status.pending { background: #fff3cd; color: #856404; }
        .status.inactive { background: #f8d7da; color: #721c24; }
        
        .pagination { 
            display: flex; 
            justify-content: center; 
            gap: 0.5rem; 
            margin-top: 1rem; 
        }
        
        .page-btn { 
            padding: 0.5rem 1rem; 
            border: 1px solid #ddd; 
            background: white; 
            cursor: pointer; 
            border-radius: 4px; 
        }
        
        .page-btn:hover { background: #f8f9fa; }
        .page-btn.active { background: #007bff; color: white; border-color: #007bff; }
        
        .stats { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 1rem; 
            font-size: 0.9rem; 
            color: #666; 
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Interactive Data Table</h1>
        <p style="text-align: center; color: #666; margin-bottom: 2rem;">${prompt}</p>
        
        <div class="search-container">
            <input type="text" class="search-input" placeholder="Search across all columns..." id="searchInput">
            <select id="statusFilter">
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
            </select>
        </div>
        
        <div class="stats">
            <span id="recordCount">Showing 0 of 0 records</span>
            <span>Click column headers to sort</span>
        </div>
        
        <div class="table-container">
            <table id="dataTable">
                <thead>
                    <tr>
                        <th class="sortable" data-column="id">ID</th>
                        <th class="sortable" data-column="name">Name</th>
                        <th class="sortable" data-column="email">Email</th>
                        <th class="sortable" data-column="department">Department</th>
                        <th class="sortable" data-column="status">Status</th>
                        <th class="sortable" data-column="lastActive">Last Active</th>
                        <th class="sortable" data-column="score">Score</th>
                    </tr>
                </thead>
                <tbody id="tableBody">
                    <!-- Data will be populated by JavaScript -->
                </tbody>
            </table>
        </div>
        
        <div class="pagination" id="pagination">
            <!-- Pagination will be populated by JavaScript -->
        </div>
    </div>
    
    <script>
        // Sample data
        const sampleData = [
            { id: 1, name: 'Alice Johnson', email: 'alice@company.com', department: 'Engineering', status: 'active', lastActive: '2024-01-15', score: 95 },
            { id: 2, name: 'Bob Smith', email: 'bob@company.com', department: 'Marketing', status: 'pending', lastActive: '2024-01-10', score: 87 },
            { id: 3, name: 'Carol Williams', email: 'carol@company.com', department: 'Sales', status: 'active', lastActive: '2024-01-14', score: 92 },
            { id: 4, name: 'David Brown', email: 'david@company.com', department: 'Engineering', status: 'inactive', lastActive: '2024-01-05', score: 78 },
            { id: 5, name: 'Emma Davis', email: 'emma@company.com', department: 'HR', status: 'active', lastActive: '2024-01-16', score: 89 },
            { id: 6, name: 'Frank Miller', email: 'frank@company.com', department: 'Finance', status: 'pending', lastActive: '2024-01-12', score: 84 },
            { id: 7, name: 'Grace Wilson', email: 'grace@company.com', department: 'Marketing', status: 'active', lastActive: '2024-01-13', score: 96 },
            { id: 8, name: 'Henry Moore', email: 'henry@company.com', department: 'Engineering', status: 'active', lastActive: '2024-01-15', score: 91 },
            { id: 9, name: 'Ivy Taylor', email: 'ivy@company.com', department: 'Sales', status: 'inactive', lastActive: '2024-01-08', score: 73 },
            { id: 10, name: 'Jack Anderson', email: 'jack@company.com', department: 'Finance', status: 'active', lastActive: '2024-01-14', score: 88 }
        ];
        
        let filteredData = [...sampleData];
        let currentSort = { column: null, direction: 'asc' };
        let currentPage = 1;
        const itemsPerPage = 5;
        
        function renderTable() {
            const tbody = document.getElementById('tableBody');
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const pageData = filteredData.slice(startIndex, endIndex);
            
            tbody.innerHTML = pageData.map(row => \`
                <tr>
                    <td>\${row.id}</td>
                    <td>\${row.name}</td>
                    <td>\${row.email}</td>
                    <td>\${row.department}</td>
                    <td><span class="status \${row.status}">\${row.status.charAt(0).toUpperCase() + row.status.slice(1)}</span></td>
                    <td>\${row.lastActive}</td>
                    <td>\${row.score}%</td>
                </tr>
            \`).join('');
            
            updateStats();
            updatePagination();
        }
        
        function updateStats() {
            const recordCount = document.getElementById('recordCount');
            const start = (currentPage - 1) * itemsPerPage + 1;
            const end = Math.min(currentPage * itemsPerPage, filteredData.length);
            recordCount.textContent = \`Showing \${start}-\${end} of \${filteredData.length} records\`;
        }
        
        function updatePagination() {
            const pagination = document.getElementById('pagination');
            const totalPages = Math.ceil(filteredData.length / itemsPerPage);
            
            let paginationHTML = '';
            
            // Previous button
            paginationHTML += \`<button class="page-btn" onclick="changePage(\${currentPage - 1})" \${currentPage === 1 ? 'disabled' : ''}>←</button>\`;
            
            // Page numbers
            for (let i = 1; i <= totalPages; i++) {
                paginationHTML += \`<button class="page-btn \${i === currentPage ? 'active' : ''}" onclick="changePage(\${i})">\${i}</button>\`;
            }
            
            // Next button
            paginationHTML += \`<button class="page-btn" onclick="changePage(\${currentPage + 1})" \${currentPage === totalPages ? 'disabled' : ''}>→</button>\`;
            
            pagination.innerHTML = paginationHTML;
        }
        
        function changePage(page) {
            const totalPages = Math.ceil(filteredData.length / itemsPerPage);
            if (page >= 1 && page <= totalPages) {
                currentPage = page;
                renderTable();
            }
        }
        
        function sortTable(column) {
            if (currentSort.column === column) {
                currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.column = column;
                currentSort.direction = 'asc';
            }
            
            // Update header classes
            document.querySelectorAll('th').forEach(th => {
                th.classList.remove('sort-asc', 'sort-desc');
            });
            
            const currentHeader = document.querySelector(\`th[data-column="\${column}"]\`);
            currentHeader.classList.add(currentSort.direction === 'asc' ? 'sort-asc' : 'sort-desc');
            
            // Sort data
            filteredData.sort((a, b) => {
                let valueA = a[column];
                let valueB = b[column];
                
                if (typeof valueA === 'string') {
                    valueA = valueA.toLowerCase();
                    valueB = valueB.toLowerCase();
                }
                
                if (currentSort.direction === 'asc') {
                    return valueA > valueB ? 1 : -1;
                } else {
                    return valueA < valueB ? 1 : -1;
                }
            });
            
            currentPage = 1;
            renderTable();
        }
        
        function filterData() {
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            const statusFilter = document.getElementById('statusFilter').value;
            
            filteredData = sampleData.filter(row => {
                const matchesSearch = Object.values(row).some(value => 
                    value.toString().toLowerCase().includes(searchTerm)
                );
                const matchesStatus = !statusFilter || row.status === statusFilter;
                
                return matchesSearch && matchesStatus;
            });
            
            currentPage = 1;
            renderTable();
        }
        
        // Event listeners
        document.getElementById('searchInput').addEventListener('input', filterData);
        document.getElementById('statusFilter').addEventListener('change', filterData);
        
        document.querySelectorAll('th.sortable').forEach(th => {
            th.addEventListener('click', () => {
                const column = th.getAttribute('data-column');
                sortTable(column);
            });
        });
        
        // Initial render
        renderTable();
    </script>
</body>
</html>`;
  }

  // Default markdown content for other types
  return `# ${prompt}

This is an AI-generated ${type} artifact in the ${category} category.

## Overview
This ${type} was created based on your request: "${prompt}"

## Features
- **Modern Design**: Clean and professional appearance
- **Responsive Layout**: Works on all device sizes  
- **Interactive Elements**: Engaging user experience
- **Accessibility**: Built with accessibility in mind

## Technical Details
- **Type**: ${type.charAt(0).toUpperCase() + type.slice(1)}
- **Category**: ${category.charAt(0).toUpperCase() + category.slice(1)}
- **Generated**: ${new Date().toLocaleDateString()}

## Next Steps
You can:
1. ✅ Copy the content using the copy button
2. 📥 Download the file using the download button
3. ✏️ Request modifications by describing changes
4. 🔄 Generate a new version with different parameters

---

*This artifact was generated using AI technology. You can modify or enhance it as needed.*`;
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

function generateTitle(prompt: string, type: string): string {
  const words = prompt.split(' ').slice(0, 6).join(' ');
  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
  return `${typeLabel}: ${words}`;
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
