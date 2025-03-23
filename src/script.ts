// Types
type Tool = 'pen' | 'eraser' | 'rectangle' | 'circle' | 'text' | 'line' | 'pan';
type ThemeMode = 'light' | 'dark';

class Whiteboard {
    // DOM Elements
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private toolbar: HTMLDivElement;
    private thicknessSlider: HTMLInputElement;
    private thicknessValue: HTMLDivElement;
    private colorOptions: NodeListOf<HTMLDivElement>;
    private toolButtons: {[key in Tool]?: HTMLButtonElement} = {};
    private undoButton: HTMLButtonElement;
    private redoButton: HTMLButtonElement;
    private saveButton: HTMLButtonElement;
    private themeSwitchButton: HTMLButtonElement;
    
    // Drawing state
    private isDrawing: boolean = false;
    private currentTool: Tool = 'pen';
    private currentColor: string = '#000000';
    private currentThickness: number = 3;
    private startX: number = 0;
    private startY: number = 0;
    private textInput: HTMLInputElement | null = null;
    
    // History for undo/redo
    private history: string[] = [];
    private redoStack: string[] = [];
    private currentStep: number = -1;
    
    // Theme
    private currentTheme: ThemeMode = 'light';
    
    // Zoom and pan
    private scale: number = 1;
    private offsetX: number = 0;
    private offsetY: number = 0;
    private isPanning: boolean = false;
    private lastPanPoint: {x: number, y: number} | null = null;

    constructor() {
        // Initialize DOM elements
        this.canvas = document.getElementById('whiteboard') as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
        this.toolbar = document.querySelector('.toolbar') as HTMLDivElement;
        this.thicknessSlider = document.getElementById('thickness') as HTMLInputElement;
        this.thicknessValue = document.getElementById('thickness-value') as HTMLDivElement;
        this.colorOptions = document.querySelectorAll('.color-option') as NodeListOf<HTMLDivElement>;
        this.toolButtons = {
            'pen': document.getElementById('pen') as HTMLButtonElement,
            'eraser': document.getElementById('eraser') as HTMLButtonElement,
            'rectangle': document.getElementById('rectangle') as HTMLButtonElement,
            'circle': document.getElementById('circle') as HTMLButtonElement,
            'text': document.getElementById('text') as HTMLButtonElement,
            'line': document.getElementById('line') as HTMLButtonElement
        };
        this.undoButton = document.getElementById('undo') as HTMLButtonElement;
        this.redoButton = document.getElementById('redo') as HTMLButtonElement;
        this.saveButton = document.getElementById('save') as HTMLButtonElement;
        this.themeSwitchButton = document.getElementById('theme-switch') as HTMLButtonElement;
        
        // Initialize canvas
        this.resizeCanvas();
        this.setupEventListeners();
        this.saveCanvasState();
        
        // Initialize UI
        this.colorOptions[0].classList.add('active');
        this.toolButtons['pen']?.classList.add('active');
        this.updateUndoRedoButtons();
    }
    
    private resizeCanvas(): void {
        this.canvas.width = window.innerWidth - this.toolbar.offsetWidth;
        this.canvas.height = window.innerHeight;
        this.redrawCanvas();
    }
    
    private setupEventListeners(): void {
        // Window events
        window.addEventListener('resize', this.resizeCanvas.bind(this));
        
        // Thickness slider
        this.thicknessSlider.addEventListener('input', () => {
            this.currentThickness = parseInt(this.thicknessSlider.value);
            this.thicknessValue.textContent = `${this.currentThickness}px`;
        });
        
        // Color selection
        this.colorOptions.forEach(option => {
            option.addEventListener('click', () => {
                this.colorOptions.forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
                
                const color = option.getAttribute('data-color');
                if (color) {
                    this.currentColor = color;
                }
                
                this.setTool('pen');
            });
        });
        
        // Tool selection
        Object.entries(this.toolButtons).forEach(([tool, button]) => {
            if (button) {
                button.addEventListener('click', () => this.setTool(tool as Tool));
            }
        });
        
        // Clear button
        const clearButton = document.getElementById('clear') as HTMLButtonElement;
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                if (confirm('Are you sure you want to clear the whiteboard?')) {
                    this.clearCanvas();
                    this.saveCanvasState();
                }
            });
        }
        
        // Undo/redo buttons
        this.undoButton.addEventListener('click', this.undo.bind(this));
        this.redoButton.addEventListener('click', this.redo.bind(this));
        
        // Save button
        this.saveButton.addEventListener('click', this.saveImage.bind(this));
        
        // Theme switch
        this.themeSwitchButton.addEventListener('click', this.toggleTheme.bind(this));
        
        // Drawing events
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('mouseout', this.handleMouseUp.bind(this));
        
        // Zoom events
        this.canvas.addEventListener('wheel', this.handleZoom.bind(this));
        
        // Touch support
        this.canvas.addEventListener('touchstart', (e: TouchEvent) => {
            e.preventDefault();
            if (e.touches.length === 1) {
                // Single touch - draw
                const touch = e.touches[0];
                const mouseEvent = new MouseEvent('mousedown', {
                    clientX: touch.clientX,
                    clientY: touch.clientY
                });
                this.canvas.dispatchEvent(mouseEvent);
            } else if (e.touches.length === 2) {
                // Two finger touch - pan
                this.isPanning = true;
                this.lastPanPoint = {
                    x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
                    y: (e.touches[0].clientY + e.touches[1].clientY) / 2
                };
            }
        });
        
        this.canvas.addEventListener('touchmove', (e: TouchEvent) => {
            e.preventDefault();
            if (e.touches.length === 1 && !this.isPanning) {
                // Single touch - draw
                const touch = e.touches[0];
                const mouseEvent = new MouseEvent('mousemove', {
                    clientX: touch.clientX,
                    clientY: touch.clientY
                });
                this.canvas.dispatchEvent(mouseEvent);
            } else if (e.touches.length === 2 && this.isPanning && this.lastPanPoint) {
                // Two finger touch - pan
                const currentX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                const currentY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                
                const deltaX = currentX - this.lastPanPoint.x;
                const deltaY = currentY - this.lastPanPoint.y;
                
                this.offsetX += deltaX;
                this.offsetY += deltaY;
                
                this.lastPanPoint = { x: currentX, y: currentY };
                this.redrawCanvas();
            }
        });
        
        this.canvas.addEventListener('touchend', (e: TouchEvent) => {
            e.preventDefault();
            if (e.touches.length === 0) {
                this.isPanning = false;
                this.lastPanPoint = null;
                const mouseEvent = new MouseEvent('mouseup', {});
                this.canvas.dispatchEvent(mouseEvent);
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                this.undo();
            } else if (e.ctrlKey && e.key === 'x') {
                e.preventDefault();
                this.redo();
            } else if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveImage();
            } else if (e.key === 'Escape') {
                if (this.textInput) {
                    this.finalizeText();
                }
            }
        });
    }
    
    private setTool(tool: Tool): void {
        this.currentTool = tool;
        
        // Remove active class from all tools
        Object.values(this.toolButtons).forEach(button => {
            if (button) button.classList.remove('active');
        });
        
        // Add active class to selected tool
        if (this.toolButtons[tool]) {
            this.toolButtons[tool]?.classList.add('active');
        }
        
        // Cancel any in-progress text input
        if (tool !== 'text' && this.textInput) {
            this.finalizeText();
        }
        
        // Set cursor based on tool
        if (tool === 'pan') {
            this.canvas.style.cursor = 'grab';
        } else if (tool === 'text') {
            this.canvas.style.cursor = 'text';
        } else {
            this.canvas.style.cursor = 'crosshair';
        }
    }
    
    private handleMouseDown(e: MouseEvent): void {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.scale - this.offsetX;
        const y = (e.clientY - rect.top) / this.scale - this.offsetY;
        
        this.startX = x;
        this.startY = y;
        
        switch (this.currentTool) {
            case 'pen':
            case 'eraser':
                this.isDrawing = true;
                this.ctx.beginPath();
                this.ctx.moveTo(x, y);
                this.draw(x, y);
                break;
            case 'rectangle':
            case 'circle':
            case 'line':
                this.isDrawing = true;
                break;
            case 'text':
                this.createTextInput(x, y);
                break;
        }
    }
    
    private handleMouseMove(e: MouseEvent): void {
        if (!this.isDrawing) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.scale - this.offsetX;
        const y = (e.clientY - rect.top) / this.scale - this.offsetY;
        
        switch (this.currentTool) {
            case 'pen':
            case 'eraser':
                this.draw(x, y);
                break;
            case 'rectangle':
            case 'circle':
            case 'line':
                this.redrawCanvas();
                this.drawShape(this.startX, this.startY, x, y, this.currentTool);
                break;
        }
    }
    
    private handleMouseUp(): void {
        if (this.isDrawing) {
            this.isDrawing = false;
            this.ctx.beginPath();
            this.saveCanvasState();
        }
    }
    
    private handleZoom(e: WheelEvent): void {
        e.preventDefault();
        
        // Get mouse position relative to canvas
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Calculate zoom direction
        const zoomDirection = e.deltaY < 0 ? 1 : -1;
        const zoomFactor = 0.1;
        const newScale = this.scale * (1 + zoomDirection * zoomFactor);
        
        // Limit zoom level
        if (newScale >= 0.5 && newScale <= 3) {
            // Calculate new offsets to zoom towards mouse position
            this.scale = newScale;
            this.redrawCanvas();
        }
    }
    
    private draw(x: number, y: number): void {
        this.ctx.save();
        
        // Apply scale and offset
        this.ctx.scale(this.scale, this.scale);
        this.ctx.translate(this.offsetX, this.offsetY);
        
        this.ctx.lineWidth = this.currentThickness;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        if (this.currentTool === 'eraser') {
            this.ctx.globalCompositeOperation = 'destination-out';
        } else {
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.strokeStyle = this.currentColor;
        }
        
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        
        this.ctx.restore();
    }
    
    private drawShape(startX: number, startY: number, endX: number, endY: number, shape: Tool): void {
        this.ctx.save();
        
        // Apply scale and offset
        this.ctx.scale(this.scale, this.scale);
        this.ctx.translate(this.offsetX, this.offsetY);
        
        this.ctx.lineWidth = this.currentThickness;
        this.ctx.strokeStyle = this.currentColor;
        
        switch (shape) {
            case 'rectangle':
                this.ctx.beginPath();
                this.ctx.rect(startX, startY, endX - startX, endY - startY);
                this.ctx.stroke();
                break;
                
            case 'circle':
                this.ctx.beginPath();
                const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
                this.ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
                this.ctx.stroke();
                break;
                
            case 'line':
                this.ctx.beginPath();
                this.ctx.moveTo(startX, startY);
                this.ctx.lineTo(endX, endY);
                this.ctx.stroke();
                break;
        }
        
        this.ctx.restore();
    }
    
    private createTextInput(x: number, y: number): void {
        // Remove any existing text input
        if (this.textInput) {
            this.finalizeText();
        }
        
        // Create a new text input
        this.textInput = document.createElement('input');
        this.textInput.type = 'text';
        this.textInput.style.position = 'absolute';
        this.textInput.style.left = `${x + this.offsetX * this.scale + this.canvas.offsetLeft}px`;
        this.textInput.style.top = `${y + this.offsetY * this.scale + this.canvas.offsetTop}px`;
        this.textInput.style.color = this.currentColor;
        this.textInput.style.background = 'transparent';
        this.textInput.style.border = 'none';
        this.textInput.style.outline = 'none';
        this.textInput.style.fontSize = `${this.currentThickness * 5}px`;
        this.textInput.style.fontFamily = 'Arial, sans-serif';
        this.textInput.style.transformOrigin = 'left top';
        this.textInput.style.transform = `scale(${this.scale})`;
        
        // Add events to handle finalizing text
        this.textInput.addEventListener('blur', this.finalizeText.bind(this));
        this.textInput.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.finalizeText();
            }
        });
        
        document.body.appendChild(this.textInput);
        this.textInput.focus();
    }
    
    private finalizeText(): void {
        if (!this.textInput) return;
        
        const text = this.textInput.value.trim();
        
        if (text) {
            const x = parseFloat(this.textInput.style.left) - this.canvas.offsetLeft - this.offsetX * this.scale;
            const y = parseFloat(this.textInput.style.top) - this.canvas.offsetTop - this.offsetY * this.scale;
            
            this.ctx.save();
            
            // Apply scale and offset
            this.ctx.scale(this.scale, this.scale);
            this.ctx.translate(this.offsetX, this.offsetY);
            
            this.ctx.font = `${this.currentThickness * 5}px Arial`;
            this.ctx.fillStyle = this.currentColor;
            this.ctx.fillText(text, x / this.scale, y / this.scale + this.currentThickness * 2);
            
            this.ctx.restore();
            
            this.saveCanvasState();
        }
        
        document.body.removeChild(this.textInput);
        this.textInput = null;
    }
    
    private clearCanvas(): void {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    private redrawCanvas(): void {
        this.clearCanvas();
        
        if (this.currentStep >= 0 && this.history.length > 0) {
            const img = new Image();
            img.src = this.history[this.currentStep];
            img.onload = () => {
                this.ctx.save();
                this.ctx.scale(this.scale, this.scale);
                this.ctx.translate(this.offsetX, this.offsetY);
                this.ctx.drawImage(img, 0, 0);
                this.ctx.restore();
            };
        }
    }
    
    private saveCanvasState(): void {
        // Clear redo stack when a new action is performed
        if (this.currentStep < this.history.length - 1) {
            this.history = this.history.slice(0, this.currentStep + 1);
            this.redoStack = [];
        }
        
        this.currentStep++;
        
        // Save the current canvas state
        const canvasData = this.canvas.toDataURL();
        this.history.push(canvasData);
        
        // Limit history size to prevent memory issues
        if (this.history.length > 20) {
            this.history.shift();
            this.currentStep--;
        }
        
        this.updateUndoRedoButtons();
    }
    
    private undo(): void {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.redoStack.push(this.history[this.currentStep + 1]);
            this.redrawCanvas();
            this.updateUndoRedoButtons();
        }
    }
    
    private redo(): void {
        if (this.redoStack.length > 0) {
            this.currentStep++;
            const redoState = this.redoStack.pop() as string;
            this.history.push(redoState);
            this.redrawCanvas();
            this.updateUndoRedoButtons();
        }
    }
    
    private updateUndoRedoButtons(): void {
        // Disable undo button if no history to undo
        if (this.currentStep <= 0) {
            this.undoButton.classList.add('disabled');
        } else {
            this.undoButton.classList.remove('disabled');
        }
        
        // Disable redo button if no history to redo
        if (this.redoStack.length === 0) {
            this.redoButton.classList.add('disabled');
        } else {
            this.redoButton.classList.remove('disabled');
        }
    }
    
    private saveImage(): void {
        // Create a temporary link element
        const link = document.createElement('a');
        
        // Set the download attribute and file name
        link.download = 'whiteboard-' + new Date().toISOString().slice(0, 10) + '.png';
        
        // Convert the canvas to a data URL and set it as the link's href
        link.href = this.canvas.toDataURL('image/png');
        
        // Append the link to the document body
        document.body.appendChild(link);
        
        // Trigger a click on the link to start the download
        link.click();
        
        // Remove the link from the document
        document.body.removeChild(link);
    }
    
    private toggleTheme(): void {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        document.body.setAttribute('data-theme', this.currentTheme);
        
        // Update button text/icon
        this.themeSwitchButton.textContent = this.currentTheme === 'light' ? '🌙' : '☀️';
    }
}

// Initialize the whiteboard when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    new Whiteboard();
}); 