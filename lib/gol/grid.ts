import Cell from "./cell";

class Grid {
    private objects: Array<Cell>;
    private context: CanvasRenderingContext2D;
    private cols: number
    private rows: number

    constructor(context: CanvasRenderingContext2D, cellSize: number, width: number, height: number) {
        this.context = context;
        this.objects = new Array<Cell>();
        this.rows = height;
        this.cols = width;
        this.createGrid(cellSize, width, height);
    }

    private createGrid(cellSize: number, rows: number, cols: number) {
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                this.objects.push(new Cell(this.context, cellSize, x, y));
            }
        }
    }

    private static NEIGHBORS: number[][] = [
        [-1, -1], [-1, 0], [-1, +1],
        [0, -1], [0, +1],
        [+1, -1], [+1, 0], [+1, +1]]

    private getCell(x: number, y: number): Cell | undefined {
        if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) {
            return undefined;
        }

        return this.objects[x * this.cols + y];
    }

    public isAlive(x: number, y: number): boolean {
        return this.getCell(x, y)?.isAlive ?? false;
    }

    public countLivingNeighbours(x: number, y: number): number {
        let count = 0;
        for (const offset of Grid.NEIGHBORS) {
            if (this.getCell(x + offset[1], y + offset[0])?.isAlive ?? false) {
                count++;
            }
        }
        return count;
    }

    public draw() {
        for (const cell of this.objects) {
            cell.draw();
        }
    }

    public run() {
        this.draw();
        for (const cell of this.objects) {
            const neighbors = this.countLivingNeighbours(cell.x, cell.y);

            if (neighbors === 2) {
                cell.nextAlive = cell.isAlive;
            } else if (neighbors === 3) {
                cell.nextAlive = true;
            } else {
                // Make dead
                cell.nextAlive = false;
            }
        }

        // Apply the new state to the cells
        for (let i = 0; i < this.objects.length; i++) {
            this.objects[i].isAlive = this.objects[i].nextAlive;
        }
    }
}

export default Grid