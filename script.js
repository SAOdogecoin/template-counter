// Constants
const BACKUP_KEY = 'templateCounterBackup';
const LAST_BACKUP_KEY = 'lastBackupTime';
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

// Template string
const template = `We've reviewed our removal orders and discovered some shipments whose delivery status is unclear. Could you please check on your end? We're unable to verify the tracking status. If they were lost in transit, could you kindly issue a reimbursement`;

let downloadedFiles = [];

// Data backup functionality
function createBackup() {
    const noteAreaValue = document.getElementById('noteArea').value;
    const merchantsCount = document.getElementById('merchantCount').textContent;
    const templatesCount = document.getElementById('totalTemplates').textContent;

    if (merchantsCount == 0 && templatesCount == 0) {
        console.log("No merchants or templates to backup.");
        return;
    }

    const backupData = {
        noteArea: noteAreaValue,
        downloadedFiles: downloadedFiles,
        timestamp: new Date().toISOString()
    };
    
    localStorage.setItem(BACKUP_KEY, JSON.stringify(backupData));
    localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
    updateBackupInfo();
}

function restoreLastBackup() {
    const backupData = JSON.parse(localStorage.getItem(BACKUP_KEY));
    if (backupData) {
        document.getElementById('noteArea').value = backupData.noteArea || '';
        downloadedFiles = backupData.downloadedFiles || [];
        updateFileList();
        countTemplates();
    }
}

function updateBackupInfo() {
    const lastBackup = localStorage.getItem(LAST_BACKUP_KEY);
    const lastBackupElement = document.getElementById('lastBackupTime');
    const nextCleanupElement = document.getElementById('nextCleanupTime');
    
    if (lastBackup) {
        const lastBackupDate = new Date(lastBackup);
        const nextCleanup = new Date(lastBackupDate.getTime() + CLEANUP_INTERVAL);
        
        lastBackupElement.textContent = lastBackupDate.toLocaleString();
        nextCleanupElement.textContent = nextCleanup.toLocaleString();
    }
}

function cleanupOldBackups() {
    const lastBackup = localStorage.getItem(LAST_BACKUP_KEY);
    if (lastBackup) {
        const lastBackupDate = new Date(lastBackup);
        const now = new Date();
        
        if (now - lastBackupDate > CLEANUP_INTERVAL) {
            localStorage.removeItem(BACKUP_KEY);
            localStorage.removeItem(LAST_BACKUP_KEY);
            downloadedFiles = [];
            updateFileList();
            updateBackupInfo();
        }
    }
}

// Auto-backup every 5 minutes
setInterval(createBackup, 5 * 60 * 1000);

// Check for cleanup every hour
setInterval(cleanupOldBackups, 60 * 60 * 1000);

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadFileHistory();
    loadThemeSettings();
    restoreLastBackup();
    updateBackupInfo();
});

function saveThemeSettings() {
    const body = document.body;
    const settings = {
        color: body.getAttribute('data-color') || 'blue',
        theme: body.getAttribute('data-theme') || 'light'
    };
    localStorage.setItem('themeSettings', JSON.stringify(settings));
}

function loadThemeSettings() {
    const saved = localStorage.getItem('themeSettings');
    if (saved) {
        const settings = JSON.parse(saved);
        // Apply color
        setColor(settings.color, false); // Add false parameter to prevent duplicate saves
        
        // Apply theme
        const body = document.body;
        const button = document.querySelector('.theme-toggle');
        if (settings.theme === 'dark') {
            body.setAttribute('data-theme', 'dark');
            button.textContent = '☀️ Light Mode';
        } else {
            body.removeAttribute('data-theme');
            button.textContent = '🌙 Dark Mode';
        }
    }
}

// Modify the setColor function to accept a save parameter
function setColor(color, save = true) {
    const colorButton = document.querySelector(`.color-${color}`);
    const ripple = document.createElement('div');
    ripple.className = 'ripple';
    
    const size = Math.max(window.innerWidth, window.innerHeight) * 2;
    
    const rect = colorButton.getBoundingClientRect();
    const x = (rect.width / 2) - (size / 2);
    const y = (rect.height / 2) - (size / 2);
    
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    
    colorButton.querySelectorAll('.ripple').forEach(oldRipple => oldRipple.remove());
    
    colorButton.appendChild(ripple);
    
    document.body.setAttribute('data-color', color);
    
    document.querySelectorAll('.color-option').forEach(option => {
        option.classList.remove('active');
        if (option.classList.contains(`color-${color}`)) {
            option.classList.add('active');
        }
    });
    
    setTimeout(() => {
        ripple.remove();
    }, 600);

    // Save theme settings if save parameter is true
    if (save) {
        saveThemeSettings();
    }
}

// Modify the toggleTheme function to save settings
function toggleTheme() {
    const body = document.body;
    const button = document.querySelector('.theme-toggle');
    if (body.getAttribute('data-theme') === 'dark') {
        body.removeAttribute('data-theme');
        button.textContent = '🌙 Dark Mode';
    } else {
        body.setAttribute('data-theme', 'dark');
        button.textContent = '☀️ Light Mode';
    }
    // Save theme settings
    saveThemeSettings();
}

function addSeparator() {
    const textarea = document.getElementById('noteArea');
    if (textarea.value && !textarea.value.endsWith('\n')) {
        textarea.value += '\n';
    }
    textarea.value += '-'.repeat(41) + '\n';  // Removed one \n to reduce spacing
}

function addSpacing() {
    const textarea = document.getElementById('noteArea');
    if (textarea.value && !textarea.value.endsWith('\n')) {
        textarea.value += '\n';
    }
    textarea.value += '\n';
    textarea.focus();
}

function clearText() {
    const textarea = document.getElementById('noteArea');
    textarea.value = '';
    countTemplates(); // Update the counters after clearing
}

function getFormattedDate() {
    const date = new Date();
    return `${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

function selectAllMerchants() {
    const checkboxes = document.querySelectorAll('.merchant-checkbox');
    // Check if all checkboxes are currently checked
    const allChecked = Array.from(checkboxes).every(checkbox => checkbox.checked);
    
    // If all are checked, uncheck all. Otherwise, check all
    checkboxes.forEach(checkbox => checkbox.checked = !allChecked);
    
    updateSelectedCount();
}

function countTemplatesInText(text) {
    return (text.match(new RegExp(template.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
}

function countTemplates() {
    const textarea = document.getElementById('noteArea');
    const text = textarea.value;
    
    const merchants = {};
    const merchantRegex = /(\d+\s+[^\n]+)/g;
    
    const sections = text.split(/-{41}/);
    let totalTemplates = 0;
    
    sections.forEach(section => {
        const match = section.match(merchantRegex);
        if (match) {
            const merchantHeader = match[0];
            const templateCount = countTemplatesInText(section);
            if (templateCount > 0) {
                merchants[merchantHeader] = {
                    text: section.trim(),
                    count: templateCount
                };
                totalTemplates += templateCount;
            }
        }
    });

    document.getElementById('merchantCount').textContent = Object.keys(merchants).length;
    document.getElementById('totalTemplates').textContent = totalTemplates;
    
    const merchantList = document.getElementById('merchantList');
    merchantList.innerHTML = ''; // Updated line

    Object.entries(merchants).forEach(([merchant, data]) => {
        const merchantDiv = document.createElement('div');
        merchantDiv.className = 'merchant-stats';
        merchantDiv.innerHTML = `
            <div>
                <input type="checkbox" class="merchant-checkbox" data-merchant="${merchant}" data-count="${data.count}" onchange="updateSelectedCount()">
                <span>${merchant}: ${data.count} case(s)</span>
            </div>
        `;
        merchantList.appendChild(merchantDiv);
    });

    // Add this line at the end of the function
    updateSelectedCount();
}

function updateSelectedCount() {
    const selectedCheckboxes = document.querySelectorAll('.merchant-checkbox:checked');
    let selectedTemplateCount = 0;
    
    selectedCheckboxes.forEach(checkbox => {
        selectedTemplateCount += parseInt(checkbox.dataset.count) || 0;
    });
    
    // Get the buttons
    const downloadSelectedButton = document.querySelector('button[onclick="downloadSelectedMerchants()"]');
    const clearSelectedButton = document.querySelector('button[onclick="clearSelectedMerchants()"]');
    
    // Enable/disable buttons based on selection
    if (selectedCheckboxes.length === 0) {
        downloadSelectedButton.disabled = true;
        clearSelectedButton.disabled = true;
    } else {
        downloadSelectedButton.disabled = false;
        clearSelectedButton.disabled = false;
    }
    
    document.getElementById('totalTemplates').textContent = selectedTemplateCount || countTemplatesInText(document.getElementById('noteArea').value);
}

function downloadSelectedMerchants() {
    const checkboxes = document.querySelectorAll('.merchant-checkbox:checked');
    if (checkboxes.length === 0) {
        alert('Please select at least one merchant');
        return;
    }

    let selectedText = '';
    let totalTemplates = 0;
    checkboxes.forEach(checkbox => {
        const merchantHeader = checkbox.dataset.merchant;
        const section = document.getElementById('noteArea').value.split(/-{41}/)
            .find(section => section.includes(merchantHeader));
        if (section) {
            selectedText += section.trim() + '\n\n' + '-'.repeat(41) + '\n\n';
            totalTemplates += countTemplatesInText(section);
        }
    });

    const filename = `3COUTB_${getFormattedDate()}_(${totalTemplates})_.txt`;
    downloadText(selectedText.trim(), filename);
}

function clearSelectedMerchants() {
    const checkboxes = document.querySelectorAll('.merchant-checkbox:checked');
    if (checkboxes.length === 0) {
        alert('Please select at least one merchant');
        return;
    }

    const textarea = document.getElementById('noteArea');
    let text = textarea.value;

    checkboxes.forEach(checkbox => {
        const merchantHeader = checkbox.dataset.merchant;
        const sections = text.split(/-{41}/);
        text = sections.filter(section => !section.includes(merchantHeader)).join('-'.repeat(41));
    });

    textarea.value = text.trim();
    countTemplates();
}

function downloadAllNotes() {
    const textarea = document.getElementById('noteArea');
    const totalTemplates = countTemplatesInText(textarea.value);
    const filename = `3COUTB_${getFormattedDate()}_(${totalTemplates})_.txt`;
    downloadText(textarea.value, filename);
}

function downloadText(text, filename) {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
    
    // Add to file history
    addToFileHistory(filename, text);
}

function toggleSettings(e) {
    if (e) {
        e.stopPropagation();
    }
    const popup = document.getElementById('settingsPopup');
    popup.classList.toggle('active');
}

document.addEventListener('click', function(e) {
    const settingsPopup = document.getElementById('settingsPopup');
    const settingsToggle = document.querySelector('.settings-toggle');
    
    if (!settingsPopup.contains(e.target) && !settingsToggle.contains(e.target)) {
        settingsPopup.classList.remove('active');
    }
});

document.getElementById('noteArea').addEventListener('input', countTemplates);
document.getElementById('noteArea').addEventListener('paste', (e) => {
    setTimeout(() => {
        const textarea = e.target;
        if (textarea.value && !textarea.value.endsWith('\n')) {
            textarea.value += '\n';
        }
    }, 0);
});

// Add this function to handle ripple effect
function createRipple(event) {
    const button = event.currentTarget;
    
    // Remove existing ripples
    const ripples = button.getElementsByClassName('button-ripple');
    for (let ripple of ripples) {
        ripple.remove();
    }

    const circle = document.createElement('span');
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.className = 'button-ripple';
    
    const rect = button.getBoundingClientRect();
    circle.style.left = `${event.clientX - rect.left}px`;
    circle.style.top = `${event.clientY - rect.top}px`;
    
    button.appendChild(circle);
    
    // Remove ripple after animation
    setTimeout(() => {
        circle.remove();
    }, 500);
}

// Add click event listeners to all buttons
document.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', createRipple);
});

// Functions to manage the file history
function addToFileHistory(filename, content) {
    const file = {
        id: Date.now(),
        name: filename,
        content: content,
        date: new Date().toLocaleString(),
    };
    downloadedFiles.unshift(file);
    updateFileList();
    saveFileHistory();
}

function updateFileList() {
    const fileList = document.getElementById('fileList');
    if (!fileList) return;
    
    fileList.innerHTML = '';
    downloadedFiles.forEach(file => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.draggable = true;
        fileItem.dataset.fileId = file.id;
        fileItem.innerHTML = `
            <input type="checkbox" onchange="updateFileSelections()">
            <span class="file-item-name">${file.name}</span>
            <span class="file-item-date">${file.date}</span>
        `;

        // Add drag and drop event listeners
        fileItem.addEventListener('dragstart', handleDragStart);
        fileItem.addEventListener('dragend', handleDragEnd);
        
        fileList.appendChild(fileItem);
    });
}

function handleDragStart(e) {
    this.classList.add('dragging');
    const fileId = this.dataset.fileId;
    const file = downloadedFiles.find(f => f.id === parseInt(fileId));
    
    // Create an actual file object for the drag operation
    const blob = new Blob([file.content], { type: 'text/plain' });
    const fileObj = new File([blob], file.name, { type: 'text/plain' });
    
    // Set up the drag data transfer with both the file and fallback text
    e.dataTransfer.setData('text/plain', file.content);
    e.dataTransfer.setData('DownloadURL', `text/plain:${file.name}:${URL.createObjectURL(blob)}`);
    
    // Add the file to dataTransfer.items and .files
    e.dataTransfer.items.add(fileObj);
    e.dataTransfer.effectAllowed = 'copy';
}

function handleDragEnd() {
    this.classList.remove('dragging');
}

function updateFileSelections() {
    const selectedFiles = document.querySelectorAll('#fileList input[type="checkbox"]:checked').length;
    document.getElementById('deleteSelectedFiles').disabled = selectedFiles === 0;
}

function deleteSelectedFiles() {
    const fileItems = document.querySelectorAll('#fileList .file-item');
    fileItems.forEach(item => {
        if (item.querySelector('input[type="checkbox"]').checked) {
            const fileId = parseInt(item.dataset.fileId);
            downloadedFiles = downloadedFiles.filter(f => f.id !== fileId);
        }
    });
    updateFileList();
    saveFileHistory();
    updateFileSelections();
}

function saveFileHistory() {
    localStorage.setItem('downloadedFiles', JSON.stringify(downloadedFiles));
}

function loadFileHistory() {
    const saved = localStorage.getItem('downloadedFiles');
    if (saved) {
        downloadedFiles = JSON.parse(saved);
        updateFileList();
    }
}

// Add the telegramShare function
function telegramShare() {
    // Get selected files or current text
    const selectedFiles = document.querySelectorAll('#fileList input[type="checkbox"]:checked');
    let textToShare = '';

    if (selectedFiles.length > 0) {
        // Share selected files from history
        selectedFiles.forEach(checkbox => {
            const fileItem = checkbox.closest('.file-item');
            const fileId = parseInt(fileItem.dataset.fileId);
            const file = downloadedFiles.find(f => f.id === fileId);
            if (file) {
                textToShare += `${file.name}\n${file.content}\n\n`;
            }
        });
    } else {
        // Share current textarea content if no files selected
        const textarea = document.getElementById('noteArea');
        const totalTemplates = countTemplatesInText(textarea.value);
        const filename = `3COUTB_${getFormattedDate()}_(${totalTemplates})_.txt`;
        textToShare = `${filename}\n${textarea.value}`;
    }

    // Encode the text for the URL
    const encodedText = encodeURIComponent(textToShare);
    
    // Create Telegram share URL
    const telegramUrl = `tg://msg?text=${encodedText}`;

    // Try to open Telegram desktop app
    window.location.href = telegramUrl;

    // Fallback to web version if desktop app is not installed
    setTimeout(() => {
        const webUrl = `https://t.me/share/url?url=&text=${encodedText}`;
        window.open(webUrl, '_blank');
    }, 500);
}

// Initialize file history when the page loads
document.addEventListener('DOMContentLoaded', function() {
    loadFileHistory();
    loadThemeSettings(); // Add this line to load theme settings on page load
});
</script>
</body></html>// Add all the existing JavaScript functions from the original file here
// The functions are omitted for brevity but should be included
