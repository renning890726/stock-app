import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';

// 模拟股票数据
const mockStockData = {
  symbol: 'AAPL',
  name: '苹果公司',
  price: 189.95,
  change: 2.15,
  changePercent: 1.15,
  volume: 51245000,
  marketCap: 3001000000000,
  pe: 28.5,
  eps: 6.67,
  historicalData: [
    { date: '2024-01-01', price: 175.23 },
    { date: '2024-01-02', price: 178.45 },
    { date: '2024-01-03', price: 176.12 },
    { date: '2024-01-04', price: 180.34 },
    { date: '2024-01-05', price: 182.67 },
    { date: '2024-01-08', price: 185.23 },
    { date: '2024-01-09', price: 183.45 },
    { date: '2024-01-10', price: 186.78 },
    { date: '2024-01-11', price: 189.95 },
  ],
};

// 模拟 watchlist 数据
const mockWatchlist = [
  { symbol: 'AAPL', name: '苹果公司', price: 189.95, change: 2.15, changePercent: 1.15 },
  { symbol: 'MSFT', name: '微软公司', price: 378.45, change: -1.23, changePercent: -0.32 },
  { symbol: 'GOOGL', name: '谷歌', price: 135.67, change: 0.89, changePercent: 0.66 },
  { symbol: 'AMZN', name: '亚马逊', price: 149.23, change: 3.45, changePercent: 2.36 },
  { symbol: 'TSLA', name: '特斯拉', price: 235.67, change: -5.23, changePercent: -2.17 },
];

function App() {
  const [stockData, setStockData] = useState(mockStockData);
  const [watchlist, setWatchlist] = useState(mockWatchlist);
  const [searchQuery, setSearchQuery] = useState('');
  const [tradeQuantity, setTradeQuantity] = useState('100');

  // 模拟获取股票数据
  const fetchStockData = async (symbol: string) => {
    // 实际项目中这里会调用真实的API
    // const response = await axios.get(`https://api.example.com/stock/${symbol}`);
    // setStockData(response.data);
    
    // 模拟API调用延迟
    setTimeout(() => {
      setStockData(mockStockData);
    }, 500);
  };

  // 处理搜索
  const handleSearch = () => {
    if (searchQuery) {
      fetchStockData(searchQuery.toUpperCase());
    }
  };

  // 处理交易
  const handleTrade = (type: 'buy' | 'sell') => {
    const quantity = parseInt(tradeQuantity);
    if (quantity > 0) {
      alert(`${type === 'buy' ? '买入' : '卖出'} ${quantity} 股 ${stockData.symbol}`);
    }
  };

  // 处理watchlist项目点击
  const handleWatchlistItemClick = (symbol: string) => {
    fetchStockData(symbol);
  };

  // 实时数据更新
  useEffect(() => {
    const interval = setInterval(() => {
      // 模拟实时数据更新
      setStockData(prev => ({
        ...prev,
        price: prev.price + (Math.random() * 2 - 1),
        change: prev.change + (Math.random() * 0.5 - 0.25),
        changePercent: prev.changePercent + (Math.random() * 0.2 - 0.1),
      }));
    }, 5000); // 每5秒更新一次

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app">
      <header className="header">
        <h1>股票交易应用</h1>
        <div className="search-bar">
          <input
            type="text"
            placeholder="输入股票代码..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch}>搜索</button>
        </div>
      </header>

      <main className="main-content">
        <div className="stock-chart">
          <h2>{stockData.symbol} - {stockData.name}</h2>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={stockData.historicalData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="date" stroke="#999" />
              <YAxis stroke="#999" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#333', border: '1px solid #444' }} 
                labelStyle={{ color: '#fff' }}
              />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke="#007bff" 
                strokeWidth={2} 
                dot={{ r: 4 }} 
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div>
          <div className="stock-info">
            <h2>股票信息</h2>
            <div className="stock-info-item">
              <span className="stock-info-label">当前价格</span>
              <span className="stock-info-value">${stockData.price.toFixed(2)}</span>
            </div>
            <div className="stock-info-item">
              <span className="stock-info-label">涨跌幅</span>
              <span className={`stock-info-value ${stockData.change >= 0 ? 'positive' : 'negative'}`}>
                {stockData.change >= 0 ? '+' : ''}{stockData.change.toFixed(2)} ({stockData.changePercent.toFixed(2)}%)
              </span>
            </div>
            <div className="stock-info-item">
              <span className="stock-info-label">成交量</span>
              <span className="stock-info-value">{stockData.volume.toLocaleString()}</span>
            </div>
            <div className="stock-info-item">
              <span className="stock-info-label">市值</span>
              <span className="stock-info-value">${(stockData.marketCap / 1000000000).toFixed(1)}B</span>
            </div>
            <div className="stock-info-item">
              <span className="stock-info-label">市盈率</span>
              <span className="stock-info-value">{stockData.pe.toFixed(1)}</span>
            </div>
            <div className="stock-info-item">
              <span className="stock-info-label">每股收益</span>
              <span className="stock-info-value">${stockData.eps.toFixed(2)}</span>
            </div>
          </div>

          <div className="trade-section">
            <h2>交易操作</h2>
            <div className="trade-form">
              <div className="trade-form-group">
                <label>股票代码</label>
                <input type="text" value={stockData.symbol} readOnly />
              </div>
              <div className="trade-form-group">
                <label>交易数量</label>
                <input 
                  type="number" 
                  value={tradeQuantity} 
                  onChange={(e) => setTradeQuantity(e.target.value)}
                  min="1"
                />
              </div>
              <div className="trade-buttons">
                <button className="buy" onClick={() => handleTrade('buy')}>买入</button>
                <button className="sell" onClick={() => handleTrade('sell')}>卖出</button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="watchlist">
        <h2>自选股</h2>
        {watchlist.map((item) => (
          <div 
            key={item.symbol} 
            className="watchlist-item"
            onClick={() => handleWatchlistItemClick(item.symbol)}
          >
            <div className="watchlist-item-info">
              <div className="watchlist-item-symbol">{item.symbol}</div>
              <div className="watchlist-item-name">{item.name}</div>
            </div>
            <div className="watchlist-item-price">
              <div className="watchlist-item-current">${item.price.toFixed(2)}</div>
              <div className={`watchlist-item-change ${item.change >= 0 ? 'positive' : 'negative'}`}>
                {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)} ({item.changePercent.toFixed(2)}%)
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;