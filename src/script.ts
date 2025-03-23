document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const canvas = document.getElementById('whiteboard') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    const thicknessSlider = document.getElementById('thickness') as HTMLInputElement;
    const thicknessValue = document.getElementById('thickness-value') as HTMLDivElement;
    const colorOptions = document.querySelectorAll('.color-option') as NodeListOf<HTMLDivElement>;
    const penButton = document.getElementById('pen') as HTMLButtonElement;
    const eraserButton = document.getElementById('eraser') as HTMLButtonElement;
    const clearButton = document.getElementById('clear') as HTMLButtonElement;
    const undoButton = document.getElementById('undo') as HTMLButtonElement;
    const redoButton = document.getElementById('redo') as HTMLButtonElement;

    // Types
    type Tool = 'pen' | 'eraser';

    // Set canvas size
    function resizeCanvas(): void {
        canvas.width = window.innerWidth - 200; // Subtract toolbar width
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Drawing state
    let isDrawing: boolean = false;
    let currentTool: Tool = 'pen';
    let currentColor: string = '#000000';
    let currentThickness: number = 3;
    
    // History for undo/redo
    let history: string[] = [];
    let redoStack: string[] = [];
    let currentStep: number = -1;

    // Save initial canvas state
    saveCanvasState();

    // Initialize the first color as active
    colorOptions[0].classList.add('active');

    // Update thickness display
    thicknessSlider.addEventListener('input', () => {
        currentThickness = parseInt(thicknessSlider.value);
        thicknessValue.textContent = `${currentThickness}px`;
    });

    // Color selection
    colorOptions.forEach(option => {
        option.addEventListener('click', () => {
            // Remove active class from all colors
            colorOptions.forEach(opt => opt.classList.remove('active'));
            
            // Add active class to selected color
            option.classList.add('active');
            
            const color = option.getAttribute('data-color');
            if (color) {
                currentColor = color;
            }
            
            // Switch to pen when color is selected
            setTool('pen');
        });
    });

    // Tool selection
    function setTool(tool: Tool): void {
        currentTool = tool;
        
        // Remove active class from all tools
        penButton.classList.remove('active');
        eraserButton.classList.remove('active');
        
        // Add active class to selected tool
        if (tool === 'pen') {
            penButton.classList.add('active');
        } else if (tool === 'eraser') {
            eraserButton.classList.add('active');
        }
    }

    penButton.addEventListener('click', () => setTool('pen'));
    eraserButton.addEventListener('click', () => setTool('eraser'));
    
    // Clear canvas
    clearButton.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear the whiteboard?')) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            saveCanvasState();
        }
    });

    // Drawing functions
    function startDrawing(e: MouseEvent): void {
        isDrawing = true;
        draw(e); // Start drawing immediately
    }

    function stopDrawing(): void {
        if (isDrawing) {
            isDrawing = false;
            ctx.beginPath(); // Reset the path for the next drawing action
            saveCanvasState(); // Save state when stroke is completed
        }
    }

    function draw(e: MouseEvent): void {
        if (!isDrawing) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        ctx.lineWidth = currentThickness;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (currentTool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = currentColor;
        }

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    }

    // Undo/Redo functions
    function saveCanvasState(): void {
        // Clear redo stack when a new action is performed
        if (currentStep < history.length - 1) {
            history = history.slice(0, currentStep + 1);
            redoStack = [];
        }
        
        currentStep++;
        
        // Save the current canvas state
        const canvasData = canvas.toDataURL();
        history.push(canvasData);
        
        // Limit history size to prevent memory issues
        if (history.length > 20) {
            history.shift();
            currentStep--;
        }
        
        // Update button states
        updateUndoRedoButtons();
    }

    function undo(): void {
        if (currentStep > 0) {
            currentStep--;
            redoStack.push(history[currentStep + 1]);
            restoreCanvasState(history[currentStep]);
            updateUndoRedoButtons();
        }
    }

    function redo(): void {
        if (redoStack.length > 0) {
            currentStep++;
            const redoState = redoStack.pop() as string;
            history.push(redoState);
            restoreCanvasState(redoState);
            updateUndoRedoButtons();
        }
    }

    function updateUndoRedoButtons(): void {
        // Disable undo button if no history to undo
        if (currentStep <= 0) {
            undoButton.classList.add('disabled');
        } else {
            undoButton.classList.remove('disabled');
        }
        
        // Disable redo button if no history to redo
        if (redoStack.length === 0) {
            redoButton.classList.add('disabled');
        } else {
            redoButton.classList.remove('disabled');
        }
    }

    function restoreCanvasState(savedState: string): void {
        const img = new Image();
        img.src = savedState;
        img.onload = function() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
    }

    // Add undo/redo buttons event listeners
    undoButton.addEventListener('click', undo);
    redoButton.addEventListener('click', redo);

    // Add undo/redo keyboard shortcuts
    document.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.ctrlKey && e.key === 'z') {
            e.preventDefault();
            undo();
        } else if (e.ctrlKey && e.key === 'x') {
            e.preventDefault();
            redo();
        }
    });

    // Initial button state
    updateUndoRedoButtons();

    // Event listeners for drawing
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    // Touch support for mobile devices
    canvas.addEventListener('touchstart', (e: TouchEvent) => {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
    });

    canvas.addEventListener('touchmove', (e: TouchEvent) => {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
    });

    canvas.addEventListener('touchend', (e: TouchEvent) => {
        e.preventDefault();
        const mouseEvent = new MouseEvent('mouseup', {});
        canvas.dispatchEvent(mouseEvent);
    });
}); 