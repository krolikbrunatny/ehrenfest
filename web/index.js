import init, { greet, add } from './pkg/ehrenfest.js';

async function run() {
    try {
        await init();
        
        const output = document.getElementById('output');
        output.innerHTML = `
            <p>${greet('WebAssembly')}</p>
            <p>2 + 3 = ${add(2, 3)}</p>
        `;
    } catch (error) {
        const output = document.getElementById('output');
        output.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
        console.error('Error loading WASM:', error);
    }
}

run();
