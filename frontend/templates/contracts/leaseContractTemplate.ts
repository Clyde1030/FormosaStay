import { PaymentFrequency, PaymentFrequencyLabels } from '../../types';

// Contract data structure from v_contract view
export interface ContractViewData {
    room_id: number;
    lease_id: number;
    tenant_id: number;
    room_full_name: string;
    contract_duration: string;
    lease_start_date_roc: string;
    lease_end_date_roc: string;
    start_date: string;
    end_date: string;
    monthly_rent: number;
    deposit: number;
    payment_term: string;
    pay_rent_on: number;
    vehicle_plate?: string | null;
    assets: any[] | null;
    lease_assets_description?: string | null;
    rate_per_kwh?: number | null;
    landlord_name?: string | null;
    landlord_address?: string | null;
    tenant_name: string;
    tenant_phone: string;
    personal_id: string;
    birthday: string;
    home_address: string;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
    contract_date?: string | null;
    contract_date_roc?: string | null;
    floor_no: number;
    room_no: string;
    building_address?: string | null;
}

// Parse ROC date string (e.g., "113年1月15日") to extract date components
// Used only as fallback if contract_date_roc is not available from view
const parseROCDateString = (rocDateString: string): { year: number; month: number; day: number } | null => {
    // Handle both formats: "113年1月15日" and "民國113年1月15日"
    const normalized = rocDateString.replace('民國', '').trim();
    const match = normalized.match(/(\d+)年(\d+)月(\d+)日/);
    if (match) {
        return {
            year: parseInt(match[1], 10),
            month: parseInt(match[2], 10),
            day: parseInt(match[3], 10)
        };
    }
    return null;
};

// Get asset counts from v_contract view assets JSONB array
const getAssetCountsFromView = (assets: any[] | null): { keys: number; cards: number; remotes: number } => {
    if (!assets || !Array.isArray(assets)) {
        return { keys: 1, cards: 1, remotes: 0 };
    }
    
    let keys = 0;
    let cards = 0;
    let remotes = 0;
    
    assets.forEach(item => {
        const itemType = typeof item === 'object' && item !== null && 'type' in item
            ? item.type
            : String(item);
        const quantity = typeof item === 'object' && item !== null && 'quantity' in item
            ? item.quantity || 1
            : 1;
        
        if (itemType === 'key') {
            keys += quantity;
        } else if (itemType === 'fob') {
            cards += quantity;
        } else if (itemType === 'controller' || itemType === 'remote') {
            remotes += quantity;
        }
    });
    
    return {
        keys: keys || 1,
        cards: cards || 1,
        remotes: remotes || 0
    };
};

export interface ManagerInfo {
    name: string | null;
    phone: string | null;
}

/**
 * Generate HTML template for the lease contract from v_contract view data.
 * 
 * @param contractData - Contract data from v_contract view
 * @param managerInfo - Manager information (name and phone)
 * @returns HTML string for the contract
 */
export const generateLeaseContractHTML = (
    contractData: ContractViewData,
    managerInfo: ManagerInfo
): string => {
    const propertyAddress = contractData.room_full_name;
    const rentalPeriod = contractData.contract_duration;
    const startROCDate = contractData.lease_start_date_roc.startsWith('民國') 
        ? contractData.lease_start_date_roc 
        : `民國${contractData.lease_start_date_roc}`;
    const endROCDate = contractData.lease_end_date_roc.startsWith('民國') 
        ? contractData.lease_end_date_roc 
        : `民國${contractData.lease_end_date_roc}`;
    
    // Get contract date - use pre-formatted ROC date from view
    let contractDate: { year: number; month: number; day: number };
    // Try contract_date_roc first, then fallback to lease_start_date_roc
    const rocDateString = contractData.contract_date_roc || contractData.lease_start_date_roc;
    if (rocDateString) {
        // Parse the ROC date string from view (format: "113年1月15日")
        const parsed = parseROCDateString(rocDateString);
        if (parsed) {
            contractDate = parsed;
        } else {
            // Fallback if parsing fails - use start_date and calculate ROC manually
            const today = new Date();
            contractDate = {
                year: today.getFullYear() - 1911,
                month: today.getMonth() + 1,
                day: today.getDate()
            };
        }
    } else {
        // Final fallback to today's date (should rarely happen)
        const today = new Date();
        contractDate = {
            year: today.getFullYear() - 1911,
            month: today.getMonth() + 1,
            day: today.getDate()
        };
    }
    
    const tenantName = contractData.tenant_name;
    const assets = getAssetCountsFromView(contractData.assets);
    const electricityRate = contractData.rate_per_kwh || 5.5;
    const summerRate = 6.0;
    
    // Map payment_term from English (from view) to Chinese
    // payment_term can be: 'monthly', 'seasonal', 'semi-annual', 'annual'
    // These match the PaymentFrequency enum values
    const paymentTermChinese = PaymentFrequencyLabels[contractData.payment_term as PaymentFrequency] || '月繳';
    
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
                1. 租金：每個月新台幣${contractData.monthly_rent}元 (含水費)*<br>
                &nbsp;&nbsp;&nbsp;&nbsp;付押金${contractData.deposit || 0}，租金${contractData.monthly_rent}，租金${paymentTermChinese}<br>
                2. 押金：新台幣${contractData.deposit || 0}元整<br>
                3. 不提供報稅<br>
                &nbsp;&nbsp;&nbsp;&nbsp;交付：${paymentTermChinese}*<br>
                &nbsp;&nbsp;&nbsp;&nbsp;附鑰匙：${assets.keys}<br>
                &nbsp;&nbsp;&nbsp;&nbsp;磁扣：${assets.cards}<br>
                &nbsp;&nbsp;&nbsp;&nbsp;遙控器：${assets.remotes}
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">三、水電費</div>
            <div class="section-content">
                1. 電費：各房間電費以獨立電表計算<br>
                2. 電費：每度以${electricityRate}元計（依台電調整，夏季${summerRate}元計*）
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
            <div class="landlord-seal">${contractData.landlord_name || ''}</div>
            <div class="party-info">
                戶籍地址：${contractData.landlord_address || ''}<br>
                身份証字號：<br>
                電話：${managerInfo.phone || ''}<br>
                管理員：${managerInfo.name || ''}
            </div>
        </div>
        
        <div class="party-section">
            <div class="party-title">乙方承租人</div>
            <div class="party-info">
                姓名：${tenantName}<br>
                車牌號碼：${contractData.vehicle_plate || '**'}<br>
                戶籍地址：${contractData.home_address || ''}<br>
                身份証字號：${contractData.personal_id || ''}<br>
                手機號碼：${contractData.tenant_phone || ''}<br>
                生日：${contractData.birthday || ''}<br>
                連絡電話：${contractData.tenant_phone || ''}
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

