document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('whiteboard');
    const ctx = canvas.getContext('2d');
    const thicknessSlider = document.getElementById('thickness');
    const thicknessValue = document.getElementById('thickness-value');
    const colorOptions = document.querySelectorAll('.color-option');
    const penButton = document.getElementById('pen');
    const eraserButton = document.getElementById('eraser');
    const clearButton = document.getElementById('clear');

    // Set canvas size
    function resizeCanvas() {
        canvas.width = window.innerWidth - 200; // Subtract toolbar width
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Drawing state
    let isDrawing = false;
    let currentTool = 'pen';
    let currentColor = '#000000';
    let currentThickness = 3;

    // Initialize the first color as active
    colorOptions[0].classList.add('active');

    // Update thickness display
    thicknessSlider.addEventListener('input', () => {
        currentThickness = thicknessSlider.value;
        thicknessValue.textContent = `${currentThickness}px`;
    });

    // Color selection
    colorOptions.forEach(option => {
        option.addEventListener('click', () => {
            // Remove active class from all colors
            colorOptions.forEach(opt => opt.classList.remove('active'));
            
            // Add active class to selected color
            option.classList.add('active');
            
            currentColor = option.getAttribute('data-color');
            
            // Switch to pen when color is selected
            setTool('pen');
        });
    });

    // Tool selection
    function setTool(tool) {
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
        }
    });

    // Drawing functions
    function startDrawing(e) {
        isDrawing = true;
        draw(e); // Start drawing immediately
    }

    function stopDrawing() {
        isDrawing = false;
        ctx.beginPath(); // Reset the path for the next drawing action
    }

    function draw(e) {
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

    // Event listeners for drawing
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    // Touch support for mobile devices
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
    });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
    });

    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        const mouseEvent = new MouseEvent('mouseup', {});
        canvas.dispatchEvent(mouseEvent);
    });
}); 