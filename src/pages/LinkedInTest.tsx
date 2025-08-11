import { LinkedInShareButton, LinkedInShareExample } from '../components/LinkedInShareButton';
import { useLinkedInShare } from '../hooks/useLinkedInShare';

export default function LinkedInTestPage() {
  const { shareToLinkedIn, generateShareUrl } = useLinkedInShare();

  const testData = {
    query: "How does machine learning improve business efficiency?",
    snippet: "Machine learning algorithms analyze vast amounts of data to identify patterns and automate decision-making processes. Companies implementing ML solutions report 20-30% efficiency improvements and significant cost reductions through predictive analytics and process optimization.",
    image: "https://curios.netlify.app/.netlify/functions/og-image?query=Machine%20Learning%20Business&snippet=Efficiency%20improvements%20through%20automation"
  };

  const handleCustomShare = () => {
    shareToLinkedIn(testData);
  };

  const shareUrl = generateShareUrl(testData);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          LinkedIn Sharing Test Page
        </h1>
        <p className="text-gray-600">
          Test the LinkedIn sharing functionality with real-time variables from CuriosAI
        </p>
      </div>

      {/* Component Examples */}
      <section className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-4">Share Button Components</h2>
        <LinkedInShareExample />
      </section>

      {/* Hook Example */}
      <section className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-4">Custom Hook Usage</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Test Query & Snippet:</h3>
            <div className="bg-gray-50 p-4 rounded-lg text-sm">
              <p><strong>Query:</strong> {testData.query}</p>
              <p><strong>Snippet:</strong> {testData.snippet}</p>
              <p><strong>Image:</strong> {testData.image}</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={handleCustomShare}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              Share with Hook
            </button>
            
            <LinkedInShareButton 
              query={testData.query}
              snippet={testData.snippet}
              image={testData.image}
              variant="default"
            />
          </div>
        </div>
      </section>

      {/* Generated URLs */}
      <section className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-4">Generated Share URLs</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Share Function URL:
            </label>
            <div className="bg-gray-50 p-3 rounded text-sm font-mono break-all">
              {shareUrl}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              LinkedIn Sharing URL:
            </label>
            <div className="bg-gray-50 p-3 rounded text-sm font-mono break-all">
              {`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-blue-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-blue-900">How LinkedIn Sharing Works</h2>
        <div className="space-y-3 text-sm text-blue-800">
          <div className="flex items-start gap-2">
            <span className="bg-blue-200 text-blue-900 px-2 py-1 rounded text-xs font-medium">1</span>
            <p>User clicks share button with real-time query, snippet, and image data</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="bg-blue-200 text-blue-900 px-2 py-1 rounded text-xs font-medium">2</span>
            <p>System generates unique URL: <code>/netlify/functions/share?query=...&snippet=...&image=...</code></p>
          </div>
          <div className="flex items-start gap-2">
            <span className="bg-blue-200 text-blue-900 px-2 py-1 rounded text-xs font-medium">3</span>
            <p>LinkedIn opens with the share URL for user to add their own commentary</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="bg-blue-200 text-blue-900 px-2 py-1 rounded text-xs font-medium">4</span>
            <p>LinkedIn crawler fetches the URL and reads dynamic OpenGraph meta tags</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="bg-blue-200 text-blue-900 px-2 py-1 rounded text-xs font-medium">5</span>
            <p>LinkedIn displays: Custom title, AI-generated snippet, and 1200x627 branded image</p>
          </div>
        </div>
      </section>

      {/* Integration Examples */}
      <section className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-4">Integration Examples</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h3 className="font-medium text-gray-900">In Search Results:</h3>
            <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
{`<LinkedInShareButton 
  query={searchQuery}
  snippet={aiResponse}
  image={firstResultImage}
  variant="minimal"
/>`}
            </pre>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-medium text-gray-900">In Share Menu:</h3>
            <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
{`const { shareToLinkedIn } = useLinkedInShare();

shareToLinkedIn({
  query: userQuery,
  snippet: extractSnippet(aiResponse),
  image: generateOGImage(query)
});`}
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
}
