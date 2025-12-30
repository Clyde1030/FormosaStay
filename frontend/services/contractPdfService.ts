import html2pdf from 'html2pdf.js';
import { TenantWithContract } from '../types';

// Landlord information (from the contract template)
const LANDLORD_INFO = {
    name: '信宇',
    address: '後壁區新嘉里白沙屯 120號之12',
    phone: '0921631690',
    manager: '楊月香'
};

// Convert Gregorian date to ROC (Republic of China) calendar format
const toROCDate = (dateString: string): { year: number; month: number; day: number } => {
    const date = new Date(dateString);
    const rocYear = date.getFullYear() - 1911; // ROC calendar starts from 1911
    return {
        year: rocYear,
        month: date.getMonth() + 1,
        day: date.getDate()
    };
};

// Format date in ROC format: 民國YYY年MM月DD日
const formatROCDate = (dateString: string): string => {
    const { year, month, day } = toROCDate(dateString);
    return `民國${year}年${month}月${day}日`;
};

// Calculate rental period in years and months
const calculateRentalPeriod = (startDate: string, endDate: string): string => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    
    if (years > 0 && months > 0) {
        return `${years}年${months}個月`;
    } else if (years > 0) {
        return `${years}年`;
    } else {
        return `${months}個月`;
    }
};

// Get asset counts from itemsIssued array
// Handles both English enum values ('key', 'fob', 'controller') and legacy Chinese values
const getAssetCounts = (itemsIssued: any[]): { keys: number; cards: number; remotes: number } => {
    let keys = 0;
    let cards = 0;
    let remotes = 0;
    
    if (!itemsIssued || !Array.isArray(itemsIssued)) {
        return { keys: 1, cards: 1, remotes: 0 };
    }
    
    itemsIssued.forEach(item => {
        const itemText = typeof item === 'object' && item !== null && 'type' in item
            ? item.type
            : String(item);
        const quantity = typeof item === 'object' && item !== null && 'quantity' in item
            ? item.quantity || 1
            : 1;
        
        // Check for English enum values first (new format)
        if (itemText === 'key' || itemText.includes('鑰匙') || itemText.includes('鑰')) {
            keys += quantity;
        } else if (itemText === 'fob' || itemText.includes('磁扣') || itemText.includes('扣')) {
            cards += quantity;
        } else if (itemText === 'controller' || itemText.includes('遙控器') || itemText.includes('遙控')) {
            remotes += quantity;
        }
    });
    
    // Default to 1 if nothing specified
    return {
        keys: keys || 1,
        cards: cards || 1,
        remotes: remotes || 0
    };
};

// Create HTML template for the contract
const createContractHTML = (tenant: TenantWithContract): string => {
    const contract = tenant.currentContract!;
    const room = tenant.room!;
    const building = tenant.building!;
    
    const propertyAddress = `${building.address || ''}${room.floor_no}樓${room.room_no}室`.trim();
    const rentalPeriod = calculateRentalPeriod(contract.startDate, contract.endDate);
    const startROCDate = formatROCDate(contract.startDate);
    const endROCDate = formatROCDate(contract.endDate);
    const contractDate = toROCDate(contract.startDate);
    const tenantName = `${tenant.last_name || ''}${tenant.first_name || ''}`;
    const assets = getAssetCounts(contract.itemsIssued || []);
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @page {
            size: A4;
            margin: 0;
        }
        body {
            font-family: 'Microsoft JhengHei', '微軟正黑體', 'Arial', sans-serif;
            background-color: #FFFFC8;
            padding: 20px;
            margin: 0;
            font-size: 12px;
            line-height: 1.6;
        }
        .contract-container {
            background-color: #FFFFC8;
            padding: 20px;
            max-width: 210mm;
            margin: 0 auto;
        }
        .title {
            text-align: center;
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 20px;
        }
        .section {
            margin-bottom: 15px;
        }
        .section-title {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .section-content {
            margin-left: 15px;
            font-size: 11px;
        }
        .party-section {
            margin-top: 20px;
            margin-bottom: 15px;
        }
        .party-title {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 8px;
        }
        .party-info {
            margin-left: 15px;
            font-size: 11px;
            line-height: 1.8;
        }
        .landlord-seal {
            color: red;
            font-size: 16px;
            font-weight: bold;
            margin-left: 40px;
            margin-top: -10px;
        }
        .date-section {
            margin-top: 20px;
            font-size: 11px;
        }
    </style>
</head>
<body>
    <div class="contract-container">
        <div class="title">房屋租賃契約書</div>
        
        <div class="section">
            <div class="section-title">一、房屋座落、範圍及用途</div>
            <div class="section-content">
                1. 房屋座落：${propertyAddress}<br>
                2. 設備：冷氣電視,冰箱,床組衣櫃.書桌.椅子*
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">二、租賃期間</div>
            <div class="section-content">
                租賃期間：${rentalPeriod}<br>
                起租日期：${startROCDate}<br>
                終止日期：${endROCDate}<br><br>
                1. 租金：每個月新台幣${contract.rentAmount}元 (含水費)*<br>
                &nbsp;&nbsp;&nbsp;&nbsp;付押金${contract.depositAmount || 0}，租金${contract.rentAmount}，租金月交<br>
                2. 押金：新台幣${contract.depositAmount || 0}元整<br>
                3. 不提供報稅<br>
                &nbsp;&nbsp;&nbsp;&nbsp;交付：每月交付*<br>
                &nbsp;&nbsp;&nbsp;&nbsp;附鑰匙：${assets.keys}<br>
                &nbsp;&nbsp;&nbsp;&nbsp;磁扣：${assets.cards}<br>
                &nbsp;&nbsp;&nbsp;&nbsp;遙控器：${assets.remotes}
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">三、水電費</div>
            <div class="section-content">
                1. 電費：各房間電費以獨立電表計算<br>
                2. 電費：每度以5.5元計（依台電調整，夏季6元計*）
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">四、違約（擾鄰/寵物）</div>
            <div class="section-content">
                若承租人違反規定、擾亂其他住戶（晚上10點後）或未經許可飼養寵物，經警告無效，出租人有權提前終止契約，沒收押金，要求搬離。
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">五、契約終止（房屋恢復）</div>
            <div class="section-content">
                契約終止時，承租人應將房屋恢復原狀、清潔並搬離。遺留家具及相關費用由承租人負擔。
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">六、新租戶看房</div>
            <div class="section-content">
                契約到期前30天，承租人同意讓新租戶看房，若無法聯繫承租人，管理員可直接進入。
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">七、承租人提前終止</div>
            <div class="section-content">
                若承租人居住未滿約定期間，視為違約，剩餘押金不予退還。
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">八、搬離時清潔</div>
            <div class="section-content">
                搬離時需清潔房間，未清潔者收取800元*清潔費。若房間過於髒亂，扣除一個月押金。
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">九、合意確認</div>
            <div class="section-content">
                雙方確認所有條款，本契約書一式兩份，雙方各執一份。
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">十、轉租</div>
            <div class="section-content">
                未經出租人同意不得轉租，違反者後果同第四條。
            </div>
        </div>
        
        <div class="party-section">
            <div class="party-title">甲方出租人</div>
            <div class="landlord-seal">${LANDLORD_INFO.name}</div>
            <div class="party-info">
                戶籍地址：${LANDLORD_INFO.address}<br>
                身份証字號：<br>
                電話：${LANDLORD_INFO.phone}<br>
                管理員：${LANDLORD_INFO.manager}
            </div>
        </div>
        
        <div class="party-section">
            <div class="party-title">乙方承租人</div>
            <div class="party-info">
                姓名：${tenantName}<br>
                車牌號碼：${contract.vehicle_plate || '**'}<br>
                戶籍地址：${tenant.address || ''}<br>
                身份証字號：${tenant.personal_id || ''}<br>
                手機號碼：${tenant.phone || ''}<br>
                生日：${tenant.birthday || ''}<br>
                連絡電話：${tenant.phone || ''}
            </div>
        </div>
        
        <div class="date-section">
            中華民國 ${contractDate.year} 年 ${contractDate.month} 月 ${contractDate.day} 日
        </div>
    </div>
</body>
</html>
    `;
};

export const generateContractPDF = async (tenant: TenantWithContract): Promise<void> => {
    if (!tenant.currentContract || !tenant.room || !tenant.building) {
        alert('無法生成合約：缺少必要的合約或房間資訊');
        return;
    }

    try {
        // Create a temporary container for the HTML
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.innerHTML = createContractHTML(tenant);
        document.body.appendChild(container);

        // Configure html2pdf options
        const options = {
            margin: 0,
            filename: `租賃契約_${tenant.last_name || ''}${tenant.first_name || ''}_${new Date().getTime()}.pdf`,
            image: { type: 'jpeg' as const, quality: 0.98 },
            html2canvas: { 
                scale: 2,
                useCORS: true,
                letterRendering: true
            },
            jsPDF: { 
                unit: 'mm', 
                format: 'a4', 
                orientation: 'portrait' as const
            }
        };

        // Generate PDF
        await html2pdf().set(options).from(container).save();

        // Clean up
        document.body.removeChild(container);
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('生成PDF時發生錯誤，請稍後再試');
    }
};
