import html2pdf from 'html2pdf.js';
import { TenantWithContract, UILabels } from '../types';
import { getManager, getContractForPDF } from './propertyService';
import { generateLeaseContractHTML, ContractViewData } from '../templates/contracts/leaseContractTemplate';

/**
 * Generate contract PDF using data from v_contract view.
 * This is the new implementation that uses v_contract view instead of TenantWithContract.
 * 
 * @param leaseId - The lease ID to fetch contract data from v_contract view
 */
export const generateContractPDF = async (leaseId: number): Promise<void> => {
    try {
        // Fetch contract data from v_contract view
        const contractData = await getContractForPDF(leaseId);
        
        // Validate required data
        if (!contractData) {
            console.error('Missing contract data for lease_id:', leaseId);
            alert('Cannot generate contract: No contract information available');
            return;
        }
        
        if (!contractData.room_full_name) {
            console.error('Missing room information:', contractData);
            alert('Cannot generate contract: No room information available');
            return;
        }
        
        console.log('Contract data received:', contractData);
        
        // Fetch manager information
        const managerInfo = await getManager();
        console.log('Manager info:', managerInfo);
        
        // Create HTML content using the template
        const htmlContent = generateLeaseContractHTML(contractData, managerInfo);
        console.log('HTML content length:', htmlContent.length);
        
        // Create a temporary container for the HTML
        // html2pdf needs the content to be in the DOM
        const container = document.createElement('div');
        container.id = 'contract-pdf-container';
        // Position it off-screen but still accessible to html2canvas
        // html2canvas can capture off-screen elements, but they need to be in the DOM
        container.style.position = 'absolute';
        container.style.left = '-10000px';
        container.style.top = '0';
        container.style.width = '794px'; // A4 width in pixels (210mm at 96 DPI)
        container.style.minHeight = '1123px'; // A4 height in pixels (297mm at 96 DPI)
        container.style.backgroundColor = '#FFFFC8'; // Match the contract background
        
        // Parse the HTML and extract just the body content with styles
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        
        // Get all styles from the head
        const styles = Array.from(doc.head.querySelectorAll('style'))
            .map(style => style.textContent)
            .join('\n');
        
        // Get the body content (the contract-container div)
        const bodyContent = doc.body.innerHTML;
        
        // Combine styles and content
        container.innerHTML = `<style>${styles}</style>${bodyContent}`;
        
        document.body.appendChild(container);

        // Wait a bit for the DOM to render and fonts to load
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Debug: Check if container has content
        const contractContainer = container.querySelector('.contract-container') as HTMLElement | null;
        if (!contractContainer) {
            console.error('Contract container not found in DOM');
            console.log('Container HTML:', container.innerHTML.substring(0, 500));
            alert('Error: Contract content not properly rendered. Please check console for details.');
            document.body.removeChild(container);
            return;
        }
        console.log('Contract container found, content length:', contractContainer.textContent?.length || 0);

        // Configure html2pdf options
        const options = {
            margin: 0,
            filename: `${UILabels.contractFilenamePrefix.en}_${contractData.tenant_name}_${new Date().getTime()}.pdf`,
            image: { type: 'jpeg' as const, quality: 0.98 },
            html2canvas: { 
                scale: 2,
                useCORS: true,
                letterRendering: true,
                logging: true, // Enable logging for debugging
                windowWidth: 794, // A4 width in pixels at 96 DPI
                windowHeight: 1123, // A4 height in pixels at 96 DPI
                allowTaint: true,
                backgroundColor: '#FFFFC8' // Ensure background color is captured
            },
            jsPDF: { 
                unit: 'mm', 
                format: 'a4', 
                orientation: 'portrait' as const
            }
        };

        console.log('Starting PDF generation...');
        
        // Generate PDF from the contract container (we already verified it exists above)
        const targetElement: HTMLElement = contractContainer || container;
        console.log('Generating PDF from element:', targetElement.className);
        
        await html2pdf().set(options).from(targetElement).save();
        
        console.log('PDF generation completed');

        // Clean up
        if (container.parentNode) {
            document.body.removeChild(container);
        }
    } catch (error) {
        console.error('Error generating PDF:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        alert(`${UILabels.pdfGenerationError.en}\n\nError: ${errorMessage}`);
    }
};

/**
 * Generate contract PDF from TenantWithContract (legacy support).
 * This function fetches the lease_id and uses the new v_contract based implementation.
 * 
 * @param tenant - TenantWithContract object (legacy parameter for backward compatibility)
 * @deprecated Use generateContractPDF(leaseId) instead
 */
export const generateContractPDFFromTenant = async (tenant: TenantWithContract): Promise<void> => {
    // For backward compatibility, extract lease_id and use the new implementation
    if (!tenant.currentContract?.id) {
        console.error('Missing contract data:', tenant);
        alert('Cannot generate contract: No contract information available');
        return;
    }
    
    await generateContractPDF(tenant.currentContract.id);
};
