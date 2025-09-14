'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface DailyPoint {
  date: string;
  points: number;
  cumulativePoints: number;
}

interface Account {
  id: string;
  name: string;
  pointsHistory: DailyPoint[];
  targetPoints: string;
}

export default function AlphaPointsCalculator() {
  // 状态管理
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currentAccountId, setCurrentAccountId] = useState<string>('');
  const [pointsHistory, setPointsHistory] = useState<DailyPoint[]>([]);
  const [targetPoints, setTargetPoints] = useState<string>('');
  const [daysToTarget, setDaysToTarget] = useState<number | null>(null);
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempPoints, setTempPoints] = useState<number>(0);
  const [showAddAccountModal, setShowAddAccountModal] = useState<boolean>(false);
  const [newAccountName, setNewAccountName] = useState<string>('');
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [fileInputKey, setFileInputKey] = useState<number>(0); // 用于重置文件输入
  const [showAccountsSummary, setShowAccountsSummary] = useState<boolean>(false);
  const [accountsSummary, setAccountsSummary] = useState<any[]>([]);

  // 导出数据函数
  const exportData = () => {
    try {
      // 准备导出的数据
      const exportData = accounts.map(account => ({
        id: account.id,
        name: account.name,
        pointsHistory: account.pointsHistory,
        targetPoints: account.targetPoints
      }));

      // 将数据转换为JSON字符串
      const dataStr = JSON.stringify(exportData, null, 2);

      // 创建Blob对象
      const dataBlob = new Blob([dataStr], { type: 'application/json' });

      // 创建下载链接
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `binance-alpha-points-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('导出数据失败:', error);
      alert('导出数据失败，请重试。');
    }
  };

  // 导入数据函数
  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const importedData = JSON.parse(content);

          // 验证导入数据的格式
          if (!Array.isArray(importedData)) {
            throw new Error('导入的文件格式不正确');
          }

          // 简单验证每个账号的数据结构
          const validData = importedData.every((item: any) =>
            item.id && typeof item.name === 'string' && Array.isArray(item.pointsHistory)
          );

          if (!validData) {
            throw new Error('导入的数据格式不正确');
          }

          // 确认是否替换现有数据
          if (window.confirm('导入数据将替换现有所有数据，确定要继续吗？')) {
            setAccounts(importedData);

            // 如果有导入的账号，选择第一个作为当前账号
            if (importedData.length > 0) {
              setCurrentAccountId(importedData[0].id);
              setCurrentAccount(importedData[0]);
              setPointsHistory(importedData[0].pointsHistory || []);
              setTargetPoints(importedData[0].targetPoints || '');

              // 重新计算累计积分
              recalculateCumulativePoints(importedData[0].pointsHistory || []);
            }

            alert('数据导入成功！');
          }
        } catch (error) {
          console.error('解析导入文件失败:', error);
          alert('解析导入文件失败，请检查文件格式。');
        }
      };
      reader.onerror = () => {
        console.error('读取文件失败');
        alert('读取文件失败，请重试。');
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('导入数据失败:', error);
      alert('导入数据失败，请重试。');
    }

    // 重置文件输入，以便可以再次选择同一文件
    setFileInputKey(prev => prev + 1);
    event.target.value = '';
  };

  // 从localStorage加载数据
  useEffect(() => {
    const savedAccounts = localStorage.getItem('alphaCalculatorAccounts');

    if (savedAccounts) {
      try {
        const accountsData = JSON.parse(savedAccounts);
        setAccounts(accountsData);

        // 如果有账号，选择第一个作为当前账号
        if (accountsData.length > 0) {
          setCurrentAccountId(accountsData[0].id);
          setCurrentAccount(accountsData[0]);
          setPointsHistory(accountsData[0].pointsHistory);
          setTargetPoints(accountsData[0].targetPoints || '');

          // 重新计算累计积分
          recalculateCumulativePoints(accountsData[0].pointsHistory);

          // 生成今天的记录（如果不存在）
          setTimeout(() => {
            generatePointsHistory();
          }, 0);
        }
      } catch (error) {
        console.error('Failed to parse saved accounts:', error);
        // 如果加载失败，创建默认账号
        createDefaultAccount();
      }
    } else {
      // 如果没有保存的账号，创建默认账号
      createDefaultAccount();
    }
  }, []);

  // 创建默认账号
  const createDefaultAccount = () => {
    const defaultAccount: Account = {
      id: Date.now().toString(),
      name: '默认账号',
      pointsHistory: [],
      targetPoints: ''
    };

    setAccounts([defaultAccount]);
    setCurrentAccountId(defaultAccount.id);
    setCurrentAccount(defaultAccount);

    // 生成积分历史
    generatePointsHistory();
  };

  // 当当前账号变化时，更新状态
  useEffect(() => {
    if (currentAccount) {
      setPointsHistory(currentAccount.pointsHistory);
      setTargetPoints(currentAccount.targetPoints || '');

      // 重新计算累计积分
      recalculateCumulativePoints(currentAccount.pointsHistory);
    }
  }, [currentAccount]);

  // 保存数据到localStorage
  useEffect(() => {
    if (accounts.length > 0) {
      localStorage.setItem('alphaCalculatorAccounts', JSON.stringify(accounts));
    }
  }, [accounts]);

  // 更新当前账号的targetPoints
  useEffect(() => {
    if (currentAccountId && targetPoints) {
      setAccounts(prevAccounts =>
        prevAccounts.map(account =>
          account.id === currentAccountId
            ? { ...account, targetPoints }
            : account
        )
      );
    }
  }, [targetPoints, currentAccountId]);

  // 创建新账号
  const createAccount = (name: string) => {
    if (!name.trim()) return;

    const newAccount: Account = {
      id: Date.now().toString(),
      name: name.trim(),
      pointsHistory: [],
      targetPoints: ''
    };

    const updatedAccounts = [...accounts, newAccount];
    setAccounts(updatedAccounts);
    setCurrentAccountId(newAccount.id);
    setCurrentAccount(newAccount);
    setShowAddAccountModal(false);
    setNewAccountName('');

    // 为新账号生成积分历史
    setTimeout(() => {
      generatePointsHistory();
    }, 0);
  };

  // 删除账号
  const deleteAccount = (accountId: string) => {
    if (accounts.length <= 1) {
      alert('至少需要保留一个账号');
      return;
    }

    const updatedAccounts = accounts.filter(account => account.id !== accountId);
    setAccounts(updatedAccounts);

    // 如果删除的是当前账号，选择第一个账号作为当前账号
    if (accountId === currentAccountId) {
      setCurrentAccountId(updatedAccounts[0].id);
      setCurrentAccount(updatedAccounts[0]);
    }
  };

  // 切换账号
  const switchAccount = (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    if (account) {
      setCurrentAccountId(accountId);
      setCurrentAccount(account);
    }
  };

  // 更新当前账号的积分历史
  const updateAccountHistory = (history: DailyPoint[]) => {
    if (currentAccountId) {
      setAccounts(prevAccounts =>
        prevAccounts.map(account =>
          account.id === currentAccountId
            ? { ...account, pointsHistory: history }
            : account
        )
      );
    }
  };

  // 计算达到目标所需天数（考虑积分过期）
  useEffect(() => {
    if (targetPoints && !isNaN(parseInt(targetPoints))) {
      const target = parseInt(targetPoints);
      if (target <= totalPoints) {
        setDaysToTarget(0);
      } else {
        // 计算用户过去15天的平均积分获取量
        let averagePointsPerDay = 16; // 默认值


        // 创建一个准确的模型来模拟积分过期
        // 只保留最近15天的有效积分
        const recentValidPoints = [...pointsHistory].map(day => day.points).slice(0, 15);

        let days = 1;
        let currentTotal = totalPoints;
        // 创建一个队列来跟踪15天内的积分
        const pointsQueue = [...recentValidPoints];

        // 模拟未来每天的积分变化，直到达到目标
        while (currentTotal < target) {
          days++;
          // 基于用户历史平均积分来预测未来积分获取
          const dailyPoints = averagePointsPerDay;

          // 添加当天的新积分
          pointsQueue.unshift(dailyPoints);

          // 如果队列长度超过15，移除最早的积分（过期）
          let expiredPoints = 0;
          if (pointsQueue.length > 15) {
            expiredPoints = pointsQueue.pop() || 0;
          }

          // 重新计算当前总积分
          currentTotal = pointsQueue.reduce((sum, points) => sum + points, 0);

          // 防止无限循环（如果目标过高，设置一个合理的上限）
          if (days > 1000) {
            setDaysToTarget(null); // 表示无法在合理时间内达到
            return;
          }
        }

        setDaysToTarget(days);
      }
    } else {
      setDaysToTarget(null);
    }
  }, [targetPoints, totalPoints, pointsHistory]);

  // 生成积分历史记录
  const generatePointsHistory = () => {
    const history: DailyPoint[] = [];
    const pointsPerDay = 16;
    const daysToShow = 15;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 设置为今天的开始时间

    // 检查是否有保存的历史数据
    const savedHistoryMap = new Map<string, number>();
    pointsHistory.forEach(day => {
      savedHistoryMap.set(day.date, day.points);
    });

    // 处理开始日期
    const startDateObj = new Date(startDate);
    startDateObj.setHours(0, 0, 0, 0);

    // 总是从今天开始生成数据，确保今天的数据存在
    for (let i = 0; i < daysToShow; i++) {
      const date = new Date();
      date.setDate(today.getDate() - i);

      // 格式化日期为字符串
      const dateStr = date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });

      // 检查是否有保存的积分数据
      if (savedHistoryMap.has(dateStr)) {
        // 使用保存的数据
        const points = savedHistoryMap.get(dateStr)!;
        history.push({
          date: dateStr,
          points: points,
          cumulativePoints: 0 // 将在后面重新计算
        });
      } else {
        // 对于没有保存数据的日期，判断是否在开始日期之后
        const currentDate = new Date(date);
        currentDate.setHours(0, 0, 0, 0);

        // 如果日期在开始日期或之后，使用默认积分值
        // 否则（开始日期之前），积分为0
        const points = currentDate >= startDateObj ? pointsPerDay : 0;

        history.push({
          date: dateStr,
          points: points,
          cumulativePoints: 0 // 将在后面重新计算
        });
      }
    }

    // 确保今天的记录存在（强制覆盖今天的数据）
    const todayStr = today.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    // 检查是否已经有今天的记录
    const todayIndex = history.findIndex(day => day.date === todayStr);

    if (todayIndex !== -1) {
      // 如果已经有今天的记录，确保它使用正确的积分值
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      const points = todayDate >= startDateObj ? pointsPerDay : 0;

      // 只有当没有保存的数据时才更新今天的积分
      if (!savedHistoryMap.has(todayStr)) {
        history[todayIndex].points = points;
      }
    } else {
      // 如果没有今天的记录，添加一个
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      const points = todayDate >= startDateObj ? pointsPerDay : 0;

      // 将今天的记录添加到历史的开头
      history.unshift({
        date: todayStr,
        points: points,
        cumulativePoints: 0
      });

      // 如果历史记录超过了指定的天数，移除最旧的记录
      if (history.length > daysToShow) {
        history.pop();
      }
    }

    // 重新计算累计积分
    recalculateCumulativePoints(history);
  };

  // 重新计算累计积分
  const recalculateCumulativePoints = (history: DailyPoint[]) => {
    let cumulative = 0;
    const newHistory = [...history];

    // 由于数据是从最新到最旧排序的，我们需要从后往前计算累计积分
    // 先计算历史累计积分
    for (let i = newHistory.length - 1; i >= 0; i--) {
      cumulative += newHistory[i].points;
      newHistory[i].cumulativePoints = cumulative;
    }

    setPointsHistory(newHistory);
    setTotalPoints(cumulative);
    updateAccountHistory(newHistory);
  };

  // 更新某一天的积分
  const updateDayPoints = (index: number, newPoints: number) => {
    if (isNaN(newPoints)) return;

    // 创建新的历史记录数组
    const newHistory = [...pointsHistory];

    // 更新该天的积分
    newHistory[index].points = newPoints;

    // 重新计算累计积分
    let cumulative = 0;
    // 由于数据是从最新到最旧排序的，我们需要从后往前计算累计积分
    for (let i = newHistory.length - 1; i >= 0; i--) {
      cumulative += newHistory[i].points;
      newHistory[i].cumulativePoints = cumulative;
    }

    // 更新状态
    setPointsHistory(newHistory);
    setTotalPoints(cumulative);
    updateAccountHistory(newHistory);
    setEditingIndex(null);
  };

  // 开始编辑积分
  const startEditing = (index: number) => {
    setEditingIndex(index);
    setTempPoints(pointsHistory[index].points);
  };

  // 取消编辑
  const cancelEditing = () => {
    setEditingIndex(null);
    setTempPoints(0);
  };

  // 处理临时积分输入变化
  const handleTempPointsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 允许输入数字和负号
    const value = e.target.value.replace(/[^0-9-]/g, '');
    // 确保能正确处理负值，包括单个负号的情况
    const numValue = parseInt(value);
    setTempPoints(isNaN(numValue) ? 0 : numValue);
  };

  // 处理目标积分输入变化
  const handleTargetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 允许输入数字和负号
    const value = e.target.value.replace(/[^0-9-]/g, '');
    setTargetPoints(value);
  };

  // 处理开始日期变化
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = new Date(e.target.value);
    // 验证日期是否有效
    if (!isNaN(selectedDate.getTime())) {
      setStartDate(selectedDate);
      // 生成新的积分历史记录
      generatePointsHistory();
    }
  };

  // 获取今天的日期，格式化为YYYY-MM-DD
  const getTodayFormatted = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 查看所有账号汇总信息
  const viewAllAccountsSummary = () => {
    try {
      // 为每个账号计算相关信息
      const summary = accounts.map(account => {
        // 计算累计积分
        const totalPoints = account.pointsHistory ?
          account.pointsHistory.reduce((sum, day) => sum + day.points, 0) : 0;

        // 获取目标积分（如果有）
        const targetPoints = account.targetPoints && !isNaN(parseInt(account.targetPoints)) ?
          parseInt(account.targetPoints) : 999999999;

        // 计算距离目标的百分比
        const progressPercentage = targetPoints ?
          Math.min((totalPoints / targetPoints) * 100, 100) : null;

        // 计算距离目标的积分差
        const pointsToTarget = targetPoints ? targetPoints - totalPoints : -999999999;

        // 计算达到目标所需天数（考虑积分过期和用户实际情况）
        let daysToTarget = null;
        if (targetPoints) {
          if (pointsToTarget <= 0) {
            daysToTarget = 0;
          } else {
            // 使用更精确的计算方式，考虑积分过期
            // 只保留最近15天的有效积分
            const recentValidPoints = account.pointsHistory ?
              [...account.pointsHistory].map(day => day.points).slice(0, 15) : [];

            let days = 1;
            let currentTotal = totalPoints;
            // 创建一个队列来跟踪15天内的积分
            const pointsQueue = [...recentValidPoints];
            // 计算用户的平均每日积分获取量（如果有足够的历史数据）
            // 恢复动态计算平均积分的逻辑以获得更准确的预计天数
            const averagePointsPerDay = 16
            // 模拟未来每天的积分变化，直到达到目标
            while (currentTotal < targetPoints) {
              days++;
              // 基于用户历史平均积分来预测未来积分获取
              const dailyPoints = averagePointsPerDay;

              // 添加当天的新积分
              pointsQueue.unshift(dailyPoints);

              // 如果队列长度超过15，移除最早的积分（过期）
              let expiredPoints = 0;
              if (pointsQueue.length > 15) {
                expiredPoints = pointsQueue.pop() || 0;
              }

              // 重新计算当前总积分
              currentTotal = pointsQueue.reduce((sum, points) => sum + points, 0);

              // 防止无限循环（如果目标过高，设置一个合理的上限）
              if (days > 1000) {
                daysToTarget = null; // 表示无法在合理时间内达到
                break;
              }
            }
            daysToTarget = days
            // 修复逻辑：无论daysToTarget之前是否为null，只要没有达到无限循环条件，就设置为计算出的天数
            if (daysToTarget !== null) {
              daysToTarget = days;
            }
          }
        }

        return {
          name: account.name,
          totalPoints: totalPoints,
          targetPoints: targetPoints,
          progressPercentage: progressPercentage,
          pointsToTarget: pointsToTarget,
          daysToTarget: daysToTarget
        };
      });

      setAccountsSummary(summary);
      setShowAccountsSummary(true);
    } catch (error) {
      console.error('获取账号汇总信息失败:', error);
      alert('获取账号汇总信息失败，请重试。');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      {/* 头部 */}
      <header className="bg-white dark:bg-slate-800 shadow">
        <div className="container mx-auto px-4 py-3 sm:py-4 flex flex-col md:flex-row justify-between items-start md:items-center">
          <div className="flex items-center mb-3 sm:mb-0">
            <Image
              src="/next.svg"
              alt="Next.js logo"
              width={36}
              height={36}
              className="mr-2 sm:mr-3 sm:w-12 sm:h-12"
            />
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              币安 Alpha 积分计算器
            </h1>
          </div>

          {/* 账号管理 */}
          <div className="flex flex-wrap gap-2 w-full">
            {/* 账号选择器 */}
            <select
              value={currentAccountId}
              onChange={(e) => switchAccount(e.target.value)}
              className="px-3 py-2 flex-grow border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              {accounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>

            {/* 查看所有账号汇总按钮 */}
            <button
              onClick={viewAllAccountsSummary}
              className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors text-sm whitespace-nowrap"
            >
              所有账号汇总
            </button>

            {/* 删除账号按钮 */}
            {accounts.length > 1 && (
              <button
                onClick={() => deleteAccount(currentAccountId)}
                className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm"
              >
                删除账号
              </button>
            )}

            {/* 添加账号按钮 */}
            <button
              onClick={() => setShowAddAccountModal(true)}
              className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm"
            >
              添加账号
            </button>

            {/* 导出数据按钮 */}
            <button
              onClick={exportData}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-sm transition-colors text-sm whitespace-nowrap"
            >
              导出数据
            </button>

            {/* 导入数据按钮 */}
            <label
              htmlFor="import-data"
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg shadow-sm transition-colors text-sm cursor-pointer whitespace-nowrap"
            >
              导入数据
            </label>
            <input
              type="file"
              id="import-data"
              accept=".json"
              onChange={importData}
              className="hidden"
              key={fileInputKey}
            />
          </div>
        </div>

        {/* 目标积分进度 */}
        <div className="container mx-auto px-4 py-3 border-t border-slate-200 dark:border-slate-700">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px]">
              <tbody>
                <tr>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      目标进度: {targetPoints ? `${totalPoints}/${targetPoints}` : '--'}
                    </span>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <div className="w-40 sm:w-48 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      {targetPoints ? (
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                          style={{
                            width: `${Math.min((totalPoints / targetPoints) * 100, 100)}%`,
                          }}
                        />
                      ) : (
                        <div className="h-full bg-slate-300 dark:bg-slate-600 w-1/2" />
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    {targetPoints ? (
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {Math.round(Math.min((totalPoints / targetPoints) * 100, 100))}%
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500 text-sm">未设置目标</span>
                    )}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    {targetPoints && daysToTarget !== null ? (
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {daysToTarget === 0 ? (
                          '已达成目标！'
                        ) : (
                          `预计还需 ${daysToTarget} 天`
                        )}
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500 text-sm">未设置目标</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 sm:py-6">
        {/* 控制面板 */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 开始日期选择 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                开始日期
              </label>
              <input
                type="date"
                value={getTodayFormatted()}
                onChange={handleDateChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            {/* 目标积分输入 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                目标积分
              </label>
              <input
                type="text"
                value={targetPoints}
                onChange={handleTargetChange}
                placeholder="请输入目标积分"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>
        </div>

        {/* 总览卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 text-center">
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">今日积分</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-600 dark:text-blue-400">
              {pointsHistory.length > 0 ? pointsHistory[0].points : 0}
            </p>
            <button
              onClick={generatePointsHistory}
              className="mt-2 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-900/50 dark:hover:bg-blue-900 dark:text-blue-200 rounded-md text-sm transition-colors w-full sm:w-auto"
            >
              生成今天记录
            </button>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 text-center">
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">累计积分</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-600 dark:text-green-400">{totalPoints}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 text-center">
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">距离目标</p>
            {daysToTarget !== null ? (
              <p className={`text-xl sm:text-2xl lg:text-3xl font-bold ${daysToTarget === 0 ? 'text-purple-600 dark:text-purple-400' : 'text-orange-600 dark:text-orange-400'}`}>
                {daysToTarget === 0 ? '已达成' : `${daysToTarget} 天`}
              </p>
            ) : (
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-400">--</p>
            )}
          </div>
        </div>

        {/* 积分历史表格 - 优化手机端显示 */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px]">
              <thead className="bg-slate-100 dark:bg-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">日期</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">当日积分</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">累计积分</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {pointsHistory.map((day, index) => (
                  <tr key={index} className={index === 0 ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}>
                    <td className="px-4 py-3 sm:py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">
                      {day.date}
                      {index === 0 && <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded">今天</span>}
                    </td>
                    <td className="px-4 py-3 sm:py-4 whitespace-nowrap text-sm">
                      {editingIndex === index ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={tempPoints}
                            onChange={handleTempPointsChange}
                            onBlur={() => updateDayPoints(index, tempPoints)}
                            onKeyDown={(e) => e.key === 'Enter' && updateDayPoints(index, tempPoints)}
                            className="w-20 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                            autoFocus
                          />
                          <button
                            onClick={() => updateDayPoints(index, tempPoints)}
                            className="px-2 py-1 bg-blue-500 text-white rounded"
                          >
                            ✓
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="px-2 py-1 bg-gray-300 dark:bg-gray-600 text-slate-900 dark:text-slate-100 rounded"
                          >
                            ✗
                          </button>
                        </div>
                      ) : (
                        <div className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1 rounded transition-colors group"
                          onClick={() => startEditing(index)}>
                          <span className="text-slate-500 dark:text-slate-300">{day.points}</span>
                          <span className="inline-block ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-slate-400">点击编辑</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 sm:py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-300">{day.cumulativePoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 信息提示 - 响应式调整 */}
        {daysToTarget !== null && daysToTarget > 0 && (
          <div className="mt-6 p-3 sm:p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
            <p className="text-orange-800 dark:text-orange-200 text-sm">
              按照当前速度，您将在 <span className="font-bold">{daysToTarget} 天</span> 后达到目标积分 {targetPoints} 分。
              预计完成日期：{new Date(Date.now() + daysToTarget * 24 * 60 * 60 * 1000).toLocaleDateString('zh-CN')}
            </p>
          </div>
        )}

        {daysToTarget === 0 && (
          <div className="mt-6 p-3 sm:p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-green-800 dark:text-green-200 text-sm">
              <span className="font-bold">恭喜您！</span> 您已达到目标积分 {targetPoints} 分。
            </p>
          </div>
        )}
      </main>

      {/* 添加账号模态框 - 响应式优化 */}
      {showAddAccountModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-5 max-w-md w-full mx-auto">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">添加新账号</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                  账号名称
                </label>
                <input
                  type="text"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  placeholder="请输入账号名称"
                  autoFocus
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  onClick={() => {
                    setShowAddAccountModal(false);
                    setNewAccountName('');
                  }}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-sm"
                >
                  取消
                </button>
                <button
                  onClick={() => createAccount(newAccountName)}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm"
                >
                  创建
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 所有账号汇总模态框 */}
      {showAccountsSummary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-5 max-w-4xl w-full mx-auto max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">所有账号积分汇总</h2>
              <button
                onClick={() => setShowAccountsSummary(false)}
                className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                关闭
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="bg-slate-100 dark:bg-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">账号名称</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">累计积分</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">目标积分</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">完成进度</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">距离目标</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">预计天数</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {accountsSummary.map((account, index) => (
                    <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">{account.name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 dark:text-slate-300">{account.totalPoints}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 dark:text-slate-300">{account.targetPoints || '--'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {account.progressPercentage ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                                style={{ width: `${account.progressPercentage}%` }}
                              />
                            </div>
                            <span className="text-slate-500 dark:text-slate-300">
                              {Math.round(account.progressPercentage)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">未设置目标</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 dark:text-slate-300">
                        {account.pointsToTarget === null ? '--' :
                          account.pointsToTarget <= 0 ? '已达成' :
                            `还需 ${account.pointsToTarget} 分`}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 dark:text-slate-300">
                        {account.daysToTarget === null ? '--' :
                          account.daysToTarget === 0 ? '已达成' :
                            `${account.daysToTarget} 天`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <footer className="max-w-4xl mx-auto mt-8 sm:mt-12 px-4 py-4 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
        <p>© {new Date().getFullYear()} 币安 Alpha 积分计算器 | 基于 Next.js 构建</p>
      </footer>
    </div>
  );
}