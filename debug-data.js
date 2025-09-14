// 调试脚本 - 检查和恢复localStorage中的Alpha积分数据

// 检查localStorage中的数据
try {
    // 检查是否存在保存的账号数据
    const savedData = localStorage.getItem('alphaCalculatorAccounts');
    
    if (savedData) {
        try {
            const accounts = JSON.parse(savedData);
            console.log('找到保存的账号数据：', accounts);
            console.log('账号数量：', accounts.length);
            
            // 检查每个账号的数据完整性
            accounts.forEach((account, index) => {
                console.log(`账号 ${index + 1} (${account.name})：`);
                console.log(`  积分历史记录数量：${account.pointsHistory ? account.pointsHistory.length : 0}`);
                console.log(`  目标积分：${account.targetPoints || '未设置'}`);
            });
            
            alert(`找到${accounts.length}个保存的账号。\n请刷新页面查看数据是否恢复。`);
        } catch (e) {
            console.error('解析保存的数据失败：', e);
            alert('保存的数据格式有误，可能已损坏。');
        }
    } else {
        console.log('localStorage中未找到保存的账号数据。');
        alert('localStorage中未找到保存的账号数据。\n可能是数据被清除或从未保存过。');
    }
} catch (e) {
    console.error('访问localStorage失败：', e);
    alert('无法访问浏览器存储，可能是浏览器限制或隐私设置导致。');
}

// 恢复数据的示例函数（如需手动恢复）
function restoreSampleData() {
    const sampleData = [
        {
            id: Date.now().toString(),
            name: '示例账号',
            pointsHistory: Array.from({length: 15}, (_, i) => ({
                date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }),
                points: 16,
                cumulativePoints: 0 // 会在应用中重新计算
            })),
            targetPoints: '200'
        }
    ];
    
    if (window.confirm('确定要导入示例数据吗？这将替换现有所有数据。')) {
        localStorage.setItem('alphaCalculatorAccounts', JSON.stringify(sampleData));
        alert('示例数据已导入，请刷新页面查看。');
    }
}