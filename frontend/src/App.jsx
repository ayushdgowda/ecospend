import { useState, useEffect } from 'react';

function App() {
  const [formData, setFormData] = useState({ item_name: '', category: '', price: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/purchases');
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('http://127.0.0.1:8000/analyze-purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          item_name: formData.item_name,
          category: formData.category,
          price: parseFloat(formData.price),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to connect to the backend.');
      }

      const data = await response.json();
      setResult(data);
      fetchHistory(); 
      setFormData({ item_name: '', category: '', price: '' }); 
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score <= 3) return 'text-green-600 bg-green-50 border-green-200';
    if (score <= 7) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-8 mt-10">
        
        <header className="text-center space-y-2">
          <h1 className="text-5xl font-extrabold text-emerald-700 tracking-tight">EcoSpend</h1>
          <p className="text-slate-500 font-medium">Sustainable Finance Tracker & Carbon Calculator</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 h-fit">
            <h2 className="text-xl font-bold text-slate-800 mb-6">New Purchase</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Item Name</label>
                <input type="text" name="item_name" required value={formData.item_name} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Category</label>
                  <select name="category" required value={formData.category} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white">
                    <option value="" disabled>Select...</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Food & Groceries">Food & Groceries</option>
                    <option value="Clothing">Clothing</option>
                    <option value="Transport">Transport</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Price ($)</label>
                  <input type="number" name="price" step="0.01" required value={formData.price} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 shadow-sm text-lg">
                {loading ? 'Consulting GreenPT AI...' : 'Analyze Purchase'}
              </button>
            </form>
            {error && <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 text-center font-medium">{error}</div>}
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center items-center min-h-[300px]">
             {result ? (
               <div className="space-y-6 w-full">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h2 className="text-xl font-bold text-slate-800">AI Analysis</h2>
                    <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded-full">⚡ GreenPT Model</span>
                  </div>
                  <div className="flex flex-col items-center space-y-4">
                    <div className={`flex flex-col items-center justify-center w-32 h-32 rounded-full border-8 ${getScoreColor(result.carbon_score)}`}>
                      <span className="text-5xl font-black">{result.carbon_score}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider mt-1 text-slate-500">/ 10 Impact</span>
                    </div>
                    <div className="text-center space-y-2">
                      <h3 className="text-2xl font-bold text-slate-800">{result.item_name}</h3>
                      <p className="text-slate-600 text-md leading-relaxed"><span className="font-bold text-emerald-700">Suggestion:</span> {result.suggestion}</p>
                    </div>
                  </div>
               </div>
             ) : (
               <div className="text-slate-400 font-medium text-center space-y-3">
                 <span className="text-4xl block">🌱</span>
                 <p>Enter a purchase to see its environmental impact.</p>
               </div>
             )}
          </div>
        </div>

        {history.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-8">
            <div className="p-6 border-b border-slate-200 bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800">Purchase History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-sm uppercase tracking-wider">
                    <th className="p-4 font-bold">Item</th>
                    <th className="p-4 font-bold">Category</th>
                    <th className="p-4 font-bold text-right">Price</th>
                    <th className="p-4 font-bold text-center">Impact Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-semibold text-slate-800">{item.item_name}</td>
                      <td className="p-4 text-slate-600">
                        <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-bold">{item.category}</span>
                      </td>
                      <td className="p-4 text-right font-medium text-slate-700">${item.price.toFixed(2)}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm border-2 ${getScoreColor(item.carbon_score)}`}>
                          {item.carbon_score}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- BRAND NEW FOOTER --- */}
        <footer className="pt-8 pb-4 text-center">
          <p className="text-slate-400 font-medium text-sm">
            Powered by <span className="font-bold text-emerald-600 tracking-wide">GreenPT AI</span>
          </p>
        </footer>

      </div>
    </div>
  );
}

export default App;