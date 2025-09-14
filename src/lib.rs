use nalgebra::DMatrix;
use ndarray::{s, Array1, Array2};
use num::Complex;
use std::f64::consts::PI;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn setup() {
    console_error_panic_hook::set_once();
}
#[wasm_bindgen]
pub struct Results {
    time_points: Vec<f64>,
    quantum_positions: Vec<f64>,
    classical_positions: Vec<f64>,
}

#[wasm_bindgen]
impl Results {
    #[wasm_bindgen(getter)]
    pub fn time_points(&self) -> Vec<f64> {
        self.time_points.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn quantum_positions(&self) -> Vec<f64> {
        self.quantum_positions.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn classical_positions(&self) -> Vec<f64> {
        self.classical_positions.clone()
    }
}

fn build_evolution_operator(
    m_intervals: usize,
    l: f64,
    delta_t: f64,
    f: f64,
) -> Array2<Complex<f64>> {
    let n_interior_points = m_intervals - 1;
    let delta_x = l / m_intervals as f64;
    let potential: Array1<f64> = Array1::from_shape_fn(n_interior_points, |i| {
        let x = (i + 1) as f64 * delta_x;
        f * x
    });
    let alpha = delta_t / (2.0 * delta_x * delta_x);
    let i_complex = Complex::new(0.0, 1.0);
    let mut g: Array2<Complex<f64>> = Array2::zeros((n_interior_points, n_interior_points));
    let mut h: Array2<Complex<f64>> = Array2::zeros((n_interior_points, n_interior_points));

    for idx in 0..n_interior_points {
        let v_i = potential[idx];
        let diag_g = 1.0 + i_complex * 2.0 * alpha + (i_complex * delta_t / 2.0) * v_i;
        let diag_h = 1.0 - i_complex * 2.0 * alpha - (i_complex * delta_t / 2.0) * v_i;
        g[[idx, idx]] = diag_g;
        h[[idx, idx]] = diag_h;
        let off_diag_g = -i_complex * alpha;
        let off_diag_h = i_complex * alpha;
        if idx > 0 {
            g[[idx, idx - 1]] = off_diag_g;
            h[[idx, idx - 1]] = off_diag_h;
        }
        if idx < n_interior_points - 1 {
            g[[idx, idx + 1]] = off_diag_g;
            h[[idx, idx + 1]] = off_diag_h;
        }
    }

    let g_nalgebra = DMatrix::from_row_slice(
        g.nrows(),
        g.ncols(),
        g.as_slice().expect("Matrix data should be contiguous"),
    );

    let g_inv_nalgebra = g_nalgebra.try_inverse().expect("Matrix G is not invertible");

    let g_inv = Array2::from_shape_vec(
        (g_inv_nalgebra.nrows(), g_inv_nalgebra.ncols()),
        g_inv_nalgebra.data.as_vec().clone(),
    ).unwrap();
    
    let u = g_inv.dot(&h);
    u
}


fn classical_x_of_t(x_0: f64, f: f64, t: f64) -> f64 {
    x_0 - f * t.powi(2)
}

fn psi_zero(x: f64, x0: f64, sigma: f64) -> f64 {
    let normalization_factor = 1.0 / (PI.powf(0.25) * sigma.sqrt());
    let exponent = (-1.0 / (2.0 * sigma.powi(2))) * ((x - x0)).powi(2);
    normalization_factor * exponent.exp()
}

#[wasm_bindgen]
pub fn run(
    l: f64,
    m: usize,
    k: usize,
    x_0: f64,
    f: f64,
    sigma: f64,
) -> Results {
    let t_final = (x_0 / f).sqrt();
    let delta_x = l / m as f64;
    let delta_t = t_final / k as f64;

    let evolution_operator_u = build_evolution_operator(m, l, delta_t, f);

    let mut psi_initial: Array1<Complex<f64>> = Array1::from_shape_fn(m + 1, |i| {
        let x = i as f64 * delta_x;
        Complex::new(psi_zero(x, x_0, sigma), 0.0)
    });

    psi_initial[0] = Complex::new(0.0, 0.0);
    psi_initial[m] = Complex::new(0.0, 0.0);
    
    let norm_sq: f64 = psi_initial.iter().map(|psi| psi.norm_sqr()).sum::<f64>() * delta_x;
    let norm = norm_sq.sqrt();
    psi_initial.mapv_inplace(|psi| psi / norm);

    let mut psi_interior = psi_initial.slice(s![1..-1]).to_owned();

    let mut time_points = Vec::with_capacity(k);
    let mut quantum_positions = Vec::with_capacity(k);
    let mut classical_positions = Vec::with_capacity(k);

    for i in 0..k {
        let current_time = i as f64 * delta_t;
        time_points.push(current_time);
        let classical_pos = classical_x_of_t(x_0, f, current_time);
        classical_positions.push(classical_pos);
        
        let expected_x = psi_interior
            .iter()
            .enumerate()
            .map(|(j, psi_val)| {
                let x_m = (j + 1) as f64 * delta_x;
                psi_val.norm_sqr() * x_m
            })
            .sum::<f64>() * delta_x;
        quantum_positions.push(expected_x);
        
        psi_interior = evolution_operator_u.dot(&psi_interior);
    }
    
    Results {
        time_points,
        quantum_positions,
        classical_positions,
    }
}