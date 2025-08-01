import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

// Kontrak ABI dan Alamat
// Pastikan untuk mengganti ini dengan alamat kontrak yang benar setelah deploy
const MON_TOKEN_ADDRESS = "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701"; 
const TOKEN_FACTORY_ADDRESS = "0xDbdC675219e74C3C8664008DFC7894A2c8838094";

const TokenFactoryABI = [
  "function launchNewToken(string memory name, string memory symbol, string memory uri, uint256 graduationMarketCap) public",
  "function getLaunchedTokens() public view returns (address[] memory)"
];
const TokenABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function owner() view returns (address)",
  "function balanceOf(address account) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)"
];
const BondingCurveABI = [
  "function isGraduated() view returns (bool)",
  "function graduate(address dexRouterAddress) public",
  "function buy() payable",
  "function sell(uint256 amount)"
];

function App() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  
  const [launchedTokens, setLaunchedTokens] = useState([]);
  const [selectedToken, setSelectedToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [launchFormData, setLaunchFormData] = useState({
    name: '',
    symbol: '',
    uri: 'https://example.com/metadata.json',
    graduationMarketCap: ''
  });
  const [tradeAmount, setTradeAmount] = useState('');
  const [chartData, setChartData] = useState([]);

  // Inisialisasi Ethers.js
  const getProvider = () => {
    if (typeof window.ethereum !== 'undefined') {
      return new ethers.BrowserProvider(window.ethereum);
    }
    return null;
  };
  
  const provider = getProvider();
  const signer = provider ? provider.getSigner() : null;
  const tokenFactory = signer ? new ethers.Contract(TOKEN_FACTORY_ADDRESS, TokenFactoryABI, signer) : null;
  const monToken = signer ? new ethers.Contract(MON_TOKEN_ADDRESS, TokenABI, signer) : null;

  // Fungsi untuk mengambil daftar token
  const fetchTokens = async () => {
    if (!tokenFactory || !provider) return;

    setLoading(true);
    try {
      const tokens = await tokenFactory.getLaunchedTokens();
      const tokensData = await Promise.all(tokens.map(async (tokenAddress) => {
        const tokenContract = new ethers.Contract(tokenAddress, TokenABI, provider);
        const name = await tokenContract.name();
        const symbol = await tokenContract.symbol();
        const owner = await tokenContract.owner();
        const curveContract = new ethers.Contract(owner, BondingCurveABI, provider);
        const isGraduated = await curveContract.isGraduated();
        const ethBalance = await provider.getBalance(owner);
        return {
          address: tokenAddress,
          name,
          symbol,
          curveAddress: owner,
          marketCap: ethers.formatEther(ethBalance),
          isGraduated
        };
      }));
      setLaunchedTokens(tokensData);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch tokens.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      fetchTokens();
    }
  }, [isConnected]);

  // Fungsi untuk meluncurkan token baru
  const handleLaunchToken = async (e) => {
    e.preventDefault();
    if (!isConnected || !signer) {
      setError('Please connect your wallet.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const launchFee = ethers.parseEther("0.2");
      const graduationMarketCap = ethers.parseEther(launchFormData.graduationMarketCap);

      const approveTx = await monToken.approve(tokenFactory.target, launchFee);
      await approveTx.wait();

      const tx = await tokenFactory.launchNewToken(
        launchFormData.name,
        launchFormData.symbol,
        launchFormData.uri,
        graduationMarketCap
      );
      await tx.wait();
      alert('Token launched successfully!');
      fetchTokens();
    } catch (err) {
      console.error(err);
      setError('Failed to launch token. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  // Fungsi untuk membeli token
  const handleBuy = async () => {
    if (!isConnected || !selectedToken || !tradeAmount || !signer) {
      setError('Please connect, select a token, and enter an amount.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const curveContract = new ethers.Contract(selectedToken.curveAddress, BondingCurveABI, signer);
      const buyAmount = ethers.parseEther(tradeAmount);
      const tx = await curveContract.buy({ value: buyAmount });
      await tx.wait();
      alert('Buy successful!');
      fetchTokens();
    } catch (err) {
      console.error(err);
      setError('Failed to buy token.');
    } finally {
      setLoading(false);
    }
  };

  // Fungsi untuk menjual token
  const handleSell = async () => {
    if (!isConnected || !selectedToken || !tradeAmount || !signer) {
      setError('Please connect, select a token, and enter an amount.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const curveContract = new ethers.Contract(selectedToken.curveAddress, BondingCurveABI, signer);
      const sellAmount = ethers.parseEther(tradeAmount);
      
      const tokenContract = new ethers.Contract(selectedToken.address, TokenABI, signer);
      const approveTx = await tokenContract.approve(curveContract.target, sellAmount);
      await approveTx.wait();

      const tx = await curveContract.sell(sellAmount);
      await tx.wait();
      alert('Sell successful!');
      fetchTokens();
    } catch (err) {
      console.error(err);
      setError('Failed to sell token.');
    } finally {
      setLoading(false);
    }
  };

  // Fungsi untuk meluluskan token
  const handleGraduate = async () => {
    if (!isConnected || !selectedToken || !signer) {
      setError('Please connect and select a token.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const curveContract = new ethers.Contract(selectedToken.curveAddress, BondingCurveABI, signer);
      const tx = await curveContract.graduate(MON_TOKEN_ADDRESS);
      await tx.wait();
      alert('Token graduated!');
      fetchTokens();
    } catch (err) {
      console.error(err);
      setError('Failed to graduate token. Market cap might not be met.');
    } finally {
      setLoading(false);
    }
  };

  // Fungsi untuk membuat data chart simulasi
  const generateChartData = () => {
    const data = [];
    let currentEth = 0;
    const initialPrice = 1;

    for (let i = 0; i < 20; i++) {
        currentEth += 0.5;
        const price = initialPrice * (currentEth / 1);
        data.push({ eth: currentEth, price: price });
    }
    setChartData(data);
  };

  useEffect(() => {
    generateChartData();
  }, [selectedToken]);

  const injectedConnector = connectors.find(c => c.id === 'injected');

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center py-4 mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Monad DEX</h1>
          {isConnected ? (
            <div className="flex items-center space-x-4">
              <span className="text-gray-600 truncate">{address}</span>
              <button onClick={() => disconnect()} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors">
                Disconnect
              </button>
            </div>
          ) : (
            <button onClick={() => connect({ connector: injectedConnector })} className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors" disabled={!injectedConnector}>
              Connect Wallet
            </button>
          )}
        </header>

        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Form Peluncuran Token */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Launch New Token</h2>
            <form onSubmit={handleLaunchToken} className="space-y-4">
              <div>
                <label className="block text-gray-700">Token Name</label>
                <input
                  type="text"
                  value={launchFormData.name}
                  onChange={(e) => setLaunchFormData({ ...launchFormData, name: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700">Token Symbol</label>
                <input
                  type="text"
                  value={launchFormData.symbol}
                  onChange={(e) => setLaunchFormData({ ...launchFormData, symbol: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700">Graduation Market Cap (ETH)</label>
                <input
                  type="number"
                  step="0.01"
                  value={launchFormData.graduationMarketCap}
                  onChange={(e) => setLaunchFormData({ ...launchFormData, graduationMarketCap: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-md"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-green-500 text-white p-2 rounded-lg hover:bg-green-600 transition-colors"
                disabled={loading || !isConnected}
              >
                {loading ? 'Launching...' : 'Launch Token (0.2 MON Fee)'}
              </button>
            </form>
          </div>

          {/* Daftar Token */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Launched Tokens</h2>
            {loading && <p>Loading tokens...</p>}
            <ul className="space-y-4">
              {launchedTokens.map(token => (
                <li
                  key={token.address}
                  onClick={() => setSelectedToken(token)}
                  className={`p-4 rounded-lg cursor-pointer transition-colors ${selectedToken?.address === token.address ? 'bg-blue-100 border-blue-500 border-2' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'}`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-gray-800">{token.name} ({token.symbol})</h3>
                      <p className="text-sm text-gray-500">Market Cap: {token.marketCap} ETH</p>
                    </div>
                    {token.isGraduated && <span className="text-xs font-semibold text-white bg-purple-500 px-2 py-1 rounded-full">Graduated</span>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Detail Token & Aksi */}
        {selectedToken && (
          <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-gray-700">{selectedToken.name} ({selectedToken.symbol})</h2>
              {selectedToken.isGraduated && (
                <span className="text-lg font-bold text-purple-600">Graduated</span>
              )}
            </div>
            
            <p className="text-sm text-gray-600 mb-4">Address: {selectedToken.address}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Chart Kurva Ikatan */}
              <div>
                <h3 className="text-xl font-medium text-gray-700 mb-2">Bonding Curve Chart</h3>
                <p className="text-sm text-gray-500 mb-4">Simulasi harga beli token berdasarkan ETH yang disuntikkan.</p>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="eth" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="price" stroke="#8884d8" name="Price (ETH)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Aksi Trading */}
              <div>
                <h3 className="text-xl font-medium text-gray-700 mb-4">Trading Actions</h3>
                <div className="flex space-x-4 mb-4">
                  <input
                    type="number"
                    step="0.01"
                    value={tradeAmount}
                    onChange={(e) => setTradeAmount(e.target.value)}
                    placeholder="Amount (ETH or Tokens)"
                    className="flex-1 p-2 border rounded-md"
                  />
                  <button
                    onClick={handleBuy}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                    disabled={loading || selectedToken.isGraduated}
                  >
                    Buy
                  </button>
                  <button
                    onClick={handleSell}
                    className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
                    disabled={loading || selectedToken.isGraduated}
                  >
                    Sell
                  </button>
                </div>
                
                <h3 className="text-xl font-medium text-gray-700 mb-4 mt-8">Graduation</h3>
                <button
                  onClick={handleGraduate}
                  className="w-full bg-purple-500 text-white p-2 rounded-lg hover:bg-purple-600 transition-colors"
                  disabled={loading || selectedToken.isGraduated}
                >
                  Graduate Token
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
