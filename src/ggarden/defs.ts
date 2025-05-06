/**
 * Groove Garden prototype
 * April 27, 2025
 */
export const COLORS = {
    'ORANGE': 'rgb(220, 100, 70)',
    'BLUE': 'rgb(150, 190, 215)',
    'YELLOW': 'rgb(250, 210, 110)',
    'WHITE': 'rgb(255, 220, 220)'
};


export type Point2 = [ x : number, y : number ];
export type Point3 = [ x : number, y : number, z : number ];
export type Vector3 = [ a : number, b : number, c : number ];

export function rotate(point : Point2, theta : number) : Point2 {
    const x = point[0] * Math.cos(theta) - point[1] * Math.sin(theta);
    const y = point[0] * Math.sin(theta) - point[1] * Math.cos(theta);
    return [ x, y ];
}

export function cross(A : Vector3, B : Vector3) : Vector3 {
    const x = A[1] * B[2] - A[2] * B[1];
    const y = A[2] * B[0] - A[0] * B[2];
    const z = A[0] * B[1] - A[1] * B[0];
    return [ x, y, z ];
}

export function dot(A : Vector3, B : Vector3) : number {
    return A[0] * B[0] + A[1] * B[1] + A[2] * B[2];
}

export function normal(a : Point3, b : Point3, c : Point3) : Vector3 {
    const AB : Vector3 = [ b[0] - a[0], b[1] - a[1], b[2] - a[2] ];
    const AC : Vector3 = [ c[0] - a[0], c[1] - a[1], c[2] - a[2] ];
    return cross(AB, AC);
}

function len(V : Vector3) : number {
    return Math.sqrt(V[0] * V[0] + V[1] * V[1] + V[2] * V[2]);
}

export function normalize(V : Vector3) : Vector3 {
    const l = len(V);
    return [ V[0] / l, V[1] / l, V[2] / l ];
}
