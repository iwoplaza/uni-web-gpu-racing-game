import type CarObject from "./carObject";

export class InputHandler
{
    public car: CarObject | null = null
    constructor( private document: Document)
    {
        this.document.addEventListener('keydown', (event) => {this.onKeyDown(event)});
    }
    onKeyDown(event: KeyboardEvent)
    {
        if(!this.car) return;
        if(event.key === 'w')
        {
            this.car.accelerate();
        }
        if(event.key === 's')
        {
            this.car.brake();
        }
        if(event.key === 'a')
        {
            this.car.turnLeft();
        }
        if(event.key === 'd')
        {
            this.car.turnRight();
        }
    }
}