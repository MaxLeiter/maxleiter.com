class Cell
{
    private context: CanvasRenderingContext2D;
    private cellSize: number;
    public x: number;
    public y: number;
    public isAlive: boolean;
    public nextAlive: boolean;

    constructor (context: CanvasRenderingContext2D, cellSize: number, x: number, y: number)
    {
        this.context = context;
        this.cellSize = cellSize;
        this.x = x;
        this.y = y;

        this.isAlive = Math.random() >= 0.5;
        // handled by game loop
        this.nextAlive = false;
    }

    draw() {
        this.context.fillStyle = this.isAlive ? '#ff8080':'#303030';
        this.context.fillRect(this.x * this.cellSize, this.y * this.cellSize, this.cellSize, this.cellSize);
    }
}

export default Cell