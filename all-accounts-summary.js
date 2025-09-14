// 所有账号信息汇总脚本
// 在浏览器控制台运行此脚本以查看所有账号的积分和距离目标信息

(function() {
    try {
        // 从localStorage获取所有账号数据
        const savedAccounts = localStorage.getItem('alphaCalculatorAccounts');
        
        if (!savedAccounts) {
            console.log('没有找到保存的账号数据。');
            alert('没有找到保存的账号数据。');
            return;
        }
        
        const accounts = JSON.parse(savedAccounts);
        
        if (!Array.isArray(accounts) || accounts.length === 0) {
            console.log('账号数据为空或格式不正确。');
            alert('账号数据为空或格式不正确。');
            return;
        }
        
        console.log(`共找到 ${accounts.length} 个账号：`);
        
        // 为每个账号计算相关信息
        const accountsSummary = accounts.map(account => {
            // 计算累计积分
            const totalPoints = account.pointsHistory ? 
                account.pointsHistory.reduce((sum, day) => sum + day.points, 0) : 0;
            
            // 获取目标积分（如果有）
            const targetPoints = account.targetPoints && !isNaN(parseInt(account.targetPoints)) ? 
                parseInt(account.targetPoints) : null;
            
            // 计算距离目标的百分比
            const progressPercentage = targetPoints ? 
                Math.min((totalPoints / targetPoints) * 100, 100) : null;
            
            // 计算距离目标的积分差
            const pointsToTarget = targetPoints ? targetPoints - totalPoints : null;
            
            // 计算达到目标所需天数（简化版，基于默认每天16分）
            const daysToTarget = targetPoints && pointsToTarget > 0 ? 
                Math.ceil(pointsToTarget / 16) : targetPoints && pointsToTarget <= 0 ? 0 : null;
            
            return {
                name: account.name,
                totalPoints: totalPoints,
                targetPoints: targetPoints,
                progressPercentage: progressPercentage,
                pointsToTarget: pointsToTarget,
                daysToTarget: daysToTarget
            };
        });
        
        // 打印表格形式的汇总信息
        console.table(accountsSummary);
        
        // 创建一个简单的HTML表格在页面上显示
        createSummaryTable(accountsSummary);
        
    } catch (error) {
        console.error('获取账号信息失败：', error);
        alert('获取账号信息失败，请重试。');
    }
})();

// 创建汇总表格并显示在页面上
function createSummaryTable(accountsSummary) {
    // 检查是否已存在汇总表格
    let summaryContainer = document.getElementById('accounts-summary-container');
    
    if (summaryContainer) {
        // 如果已存在，移除旧的
        summaryContainer.remove();
    }
    
    // 创建新的容器
    summaryContainer = document.createElement('div');
    summaryContainer.id = 'accounts-summary-container';
    summaryContainer.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        max-width: 800px;
        max-height: 80vh;
        overflow-y: auto;
    `;
    
    // 添加标题
    const title = document.createElement('h3');
    title.textContent = '所有账号积分汇总';
    title.style.cssText = 'margin-top: 0; margin-bottom: 16px; font-size: 18px;';
    summaryContainer.appendChild(title);
    
    // 创建表格
    const table = document.createElement('table');
    table.style.cssText = 'width: 100%; border-collapse: collapse;';
    
    // 创建表头
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr style="background-color: #f9f9f9;">
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">账号名称</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">累计积分</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">目标积分</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">完成进度</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">距离目标</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">预计天数</th>
        </tr>
    `;
    table.appendChild(thead);
    
    // 创建表体
    const tbody = document.createElement('tbody');
    
    accountsSummary.forEach(account => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="border: 1px solid #ddd; padding: 8px;">${account.name}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${account.totalPoints}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${account.targetPoints || '--'}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">
                ${account.progressPercentage ? 
                    `<div style="width: 100px; height: 8px; background-color: #f0f0f0; border-radius: 4px; overflow: hidden;">
                        <div style="width: ${account.progressPercentage}%; height: 100%; background-color: ${account.progressPercentage >= 100 ? '#4caf50' : '#2196f3'};"></div>
                     </div>
                     <span>${Math.round(account.progressPercentage)}%</span>` : 
                    '--'}
            </td>
            <td style="border: 1px solid #ddd; padding: 8px;">
                ${account.pointsToTarget === null ? '--' : 
                    account.pointsToTarget <= 0 ? '已达成' : 
                    `还需 ${account.pointsToTarget} 分`}
            </td>
            <td style="border: 1px solid #ddd; padding: 8px;">
                ${account.daysToTarget === null ? '--' : 
                    account.daysToTarget === 0 ? '已达成' : 
                    `${account.daysToTarget} 天`}
            </td>
        `;
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    summaryContainer.appendChild(table);
    
    // 添加关闭按钮
    const closeButton = document.createElement('button');
    closeButton.textContent = '关闭';
    closeButton.style.cssText = `
        margin-top: 16px;
        padding: 6px 12px;
        background-color: #f44336;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    `;
    closeButton.onclick = () => {
        summaryContainer.remove();
    };
    summaryContainer.appendChild(closeButton);
    
    // 添加到页面
    document.body.appendChild(summaryContainer);
}

// 导出函数以便在控制台中直接调用
export function showAllAccountsSummary() {
    // 这里可以留空，主要功能已在自执行函数中实现
}