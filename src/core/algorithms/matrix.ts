function assertFiniteNumber(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`);
  }
}

function assertRectangularMatrix(matrix: number[][], label: string): void {
  if (!Array.isArray(matrix) || matrix.length === 0) {
    throw new Error(`${label} cannot be empty`);
  }

  const columnCount = matrix[0]?.length ?? 0;
  if (columnCount === 0) {
    throw new Error(`${label} must have at least one column`);
  }

  for (let rowIndex = 0; rowIndex < matrix.length; rowIndex++) {
    const row = matrix[rowIndex];
    if (!row || row.length !== columnCount) {
      throw new Error(`${label} must be rectangular`);
    }

    for (let columnIndex = 0; columnIndex < row.length; columnIndex++) {
      assertFiniteNumber(
        row[columnIndex] ?? Number.NaN,
        `${label}[${rowIndex}][${columnIndex}]`
      );
    }
  }
}

function assertVector(vector: number[], label: string): void {
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new Error(`${label} cannot be empty`);
  }

  for (let index = 0; index < vector.length; index++) {
    assertFiniteNumber(vector[index] ?? Number.NaN, `${label}[${index}]`);
  }
}

export function transpose(matrix: number[][]): number[][] {
  assertRectangularMatrix(matrix, "matrix");

  const rowCount = matrix.length;
  const columnCount = matrix[0]?.length ?? 0;

  return Array.from({ length: columnCount }, (_, columnIndex) =>
    Array.from(
      { length: rowCount },
      (_, rowIndex) => matrix[rowIndex]?.[columnIndex] ?? 0
    )
  );
}

export function add(left: number[][], right: number[][]): number[][] {
  assertRectangularMatrix(left, "left");
  assertRectangularMatrix(right, "right");

  const leftColumns = left[0]?.length ?? 0;
  const rightColumns = right[0]?.length ?? 0;
  if (left.length !== right.length || leftColumns !== rightColumns) {
    throw new Error(
      `Matrix dimension mismatch: (${left.length}x${leftColumns}) vs (${right.length}x${rightColumns})`
    );
  }

  return left.map((row, rowIndex) =>
    row.map(
      (value, columnIndex) => value + (right[rowIndex]?.[columnIndex] ?? 0)
    )
  );
}

export function scale(matrix: number[][], scalar: number): number[][] {
  assertRectangularMatrix(matrix, "matrix");
  assertFiniteNumber(scalar, "scalar");

  if (scalar === 1) {
    return matrix.map((row) => [...row]);
  }

  if (scalar === 0) {
    return matrix.map((row) => row.map(() => 0));
  }

  return matrix.map((row) => row.map((value) => value * scalar));
}

export function matmulVector(matrix: number[][], vector: number[]): number[] {
  assertRectangularMatrix(matrix, "matrix");
  assertVector(vector, "vector");

  const columnCount = matrix[0]?.length ?? 0;
  if (columnCount !== vector.length) {
    throw new Error(
      `Dimension mismatch: matrix is ${matrix.length}x${columnCount}, vector is ${vector.length}`
    );
  }

  const result = new Array(matrix.length).fill(0);

  for (let rowIndex = 0; rowIndex < matrix.length; rowIndex++) {
    let sum = 0;
    const row = matrix[rowIndex];
    if (!row) {
      continue;
    }

    for (let columnIndex = 0; columnIndex < row.length; columnIndex++) {
      sum += (row[columnIndex] ?? 0) * (vector[columnIndex] ?? 0);
    }

    result[rowIndex] = sum;
  }

  return result;
}

export function residualAdd(
  original: number[],
  transformed: number[],
  lambda = 1
): number[] {
  assertVector(original, "original");
  assertVector(transformed, "transformed");
  assertFiniteNumber(lambda, "lambda");

  if (original.length !== transformed.length) {
    throw new Error(
      `Vector dimension mismatch: ${original.length} vs ${transformed.length}`
    );
  }

  return original.map(
    (value, index) => value + lambda * (transformed[index] ?? 0)
  );
}
