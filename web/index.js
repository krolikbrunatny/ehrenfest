import init, { run, setup } from './pkg/ehrenfest.js';

let chartInstances = {}; 

function createOrUpdatePlot(canvasId, xData, yData, title, xLabel, yLabel, datasetLabel, borderColor) {
    const ctx = document.getElementById(canvasId).getContext('2d');

    if (chartInstances[canvasId]) {
        const chart = chartInstances[canvasId];
        chart.data.labels = xData.map(t => t.toFixed(2));
        chart.data.datasets[0].data = yData;
        chart.options.plugins.title.text = title;
        chart.update();
    } else {
        chartInstances[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: xData.map(t => t.toFixed(2)),
                datasets: [{
                    label: datasetLabel,
                    data: yData,
                    borderColor: borderColor,
                    backgroundColor: borderColor + '20',
                    borderWidth: 2,
                    tension: 0.3,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointHoverBorderWidth: 2,
                    pointHoverBorderColor: '#ffffff',
                    fill: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                animation: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    title: { 
                        display: true, 
                        text: title, 
                        font: { 
                            size: 18, 
                            weight: '600',
                            family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
                        },
                        color: '#1d1d1f',
                        padding: { bottom: 20 }
                    },
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: borderColor,
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: false,
                        titleFont: { weight: '600' },
                        bodyFont: { weight: '400' }
                    }
                },
                scales: {
                    x: {
                        title: { 
                            display: true, 
                            text: xLabel, 
                            font: { 
                                size: 14, 
                                weight: '500',
                                family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
                            },
                            color: '#86868b'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.06)',
                            lineWidth: 1
                        },
                        ticks: {
                            color: '#86868b',
                            font: { size: 12 }
                        }
                    },
                    y: {
                        title: { 
                            display: true, 
                            text: yLabel, 
                            font: { 
                                size: 14, 
                                weight: '500',
                                family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
                            },
                            color: '#86868b'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.06)',
                            lineWidth: 1
                        },
                        ticks: {
                            color: '#86868b',
                            font: { size: 12 }
                        }
                    }
                }
            }
        });
    }
}

async function calculate() {
    const runButton = document.getElementById('run-button');
    const statusMessage = document.getElementById('status-message');

    try {
        runButton.disabled = true;
        statusMessage.textContent = 'Calculating...';

        // Allow the UI to update before starting the computation
        await new Promise(resolve => setTimeout(resolve, 50));

        const l = parseFloat(document.getElementById('param-l').value);
        const m = parseInt(document.getElementById('param-m').value);
        const k = parseInt(document.getElementById('param-k').value);
        const x_0 = parseFloat(document.getElementById('param-x0').value);
        const f = parseFloat(document.getElementById('param-f').value);
        const sigma = parseFloat(document.getElementById('param-sigma').value);

        const results = run(l, m, k, x_0, f, sigma);
        const { time_points, quantum_positions, classical_positions } = results;

        createOrUpdatePlot(
            'quantumChart', time_points, quantum_positions,
            'Quantum Expected Position ⟨x̂⟩(t)', 'Time (t)', 'Position ⟨x̂⟩',
            'Quantum Position', '#007AFF'
        );

        createOrUpdatePlot(
            'classicalChart', time_points, classical_positions,
            'Classical Position x_cl(t)', 'Time (t)', 'Position x_cl',
            'Classical Position', '#34C759'
        );

        const difference = quantum_positions.map((q, i) => q - classical_positions[i]);
        createOrUpdatePlot(
            'differenceChart', time_points, difference,
            'Position Difference (⟨x̂⟩ - x_cl)(t)', 'Time (t)', 'Difference Δx',
            'Difference (Quantum - Classical)', '#FF3B30'
        );
        
        // Small delay to show the completion message
        await new Promise(resolve => setTimeout(resolve, 200));
        statusMessage.textContent = 'Calculation complete';

    } catch (error) {
        statusMessage.textContent = `Error: ${error.message}`;
        console.error('Error during WASM execution or plotting:', error);
    } finally {
        runButton.disabled = false;
    }
}

function setupUI() {
    const controls = [
        { id: 'param-x0',    valId: 'val-x0',    format: (v) => parseFloat(v).toFixed(2) },
        { id: 'param-sigma', valId: 'val-sigma', format: (v) => parseFloat(v).toFixed(2) },
        { id: 'param-f',     valId: 'val-f',     format: (v) => parseFloat(v).toFixed(2) },
        { id: 'param-m',     valId: 'val-m',     format: (v) => parseInt(v) },
        { id: 'param-k',     valId: 'val-k',     format: (v) => parseInt(v) },
        { id: 'param-l',     valId: 'val-l',     format: (v) => parseFloat(v).toFixed(2) },
    ];

    controls.forEach(control => {
        const inputElement = document.getElementById(control.id);
        const valueElement = document.getElementById(control.valId);
        inputElement.addEventListener('input', () => {
            valueElement.textContent = control.format(inputElement.value);
        });
    });
}


async function main() {
    try {
        await init();
        setup(); 
        setupUI();
        
        document.getElementById('run-button').addEventListener('click', calculate);

        await calculate(); 
    } catch (error) {
        document.body.innerHTML = `<p style="color: red;">Failed to initialize WebAssembly module: ${error.message}</p>`;
        console.error('WASM Initialization Error:', error);
    }
}

main();