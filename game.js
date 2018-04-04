'use strict';

class Vector {
   constructor(x = 0, y = 0) {
      this.x = x;
      this.y = y;
   }

   plus(addVector) {
      if ( !(addVector instanceof Vector) ) {
         throw new SyntaxError('Можно прибавлять к вектору только вектор типа Vector');
      }
 
      return new Vector(
         this.x + addVector.x,
         this.y + addVector.y
      );
   }

   times(n) {
      return new Vector(
         this.x * n,
         this.y * n
      );
   }
}

class Actor {
   constructor(
      pos = new Vector(0, 0), 
      size = new Vector(1, 1), 
      speed = new Vector(0, 0)
   ) {
      let checkArguments = pos instanceof Vector
         && size instanceof Vector
         && speed instanceof Vector;

      if (!checkArguments) {
         throw new SyntaxError("Agrument is wrong");
      }

      this.pos = pos;
      this.size = size;
      this.speed = speed;
   }

   get left() {return this.pos.x;}
   get top() {return this.pos.y;}
   get right() {return this.pos.x + this.size.x;}
   get bottom() {return this.pos.y + this.size.y;}

   isIntersect(other) {
      if ( !(other instanceof Actor) ) {
         throw new SyntaxError("Agrument is wrong");
      }
      
      if (this === other) return false;

      if (this.pos.x === other.pos.x && this.pos.y === other.pos.y 
         && other.size.x < 0 && other.size.y < 0) return false;
      
      return isIntersectRect(
            this.left, this.right, this.top, this.bottom,  
            other.left, other.right, other.top, other.bottom
      );
   }

   act() {}   
}

Object.defineProperty(Actor.prototype, 'type', {
      value: 'actor',
});

class Player extends Actor {
   constructor(pos = new Vector()) {
      super(
         pos, 
         new Vector(0.8, 1.5) 
      );
      
      this.pos.y -= 0.5; 
   }
}

Object.defineProperty(Player.prototype, 'type', {
      value: 'player',
});

class Coin extends Actor {
   constructor(pos = new Vector()) {
      super(
         new Vector(pos.x + 0.2, pos.y + 0.1), 
         new Vector(0.6, 0.6)
      );

      this.spring = Math.random() * Math.PI * 2;
      this.springSpeed = 8;
      this.springDist = 0.07;

      this.startPos = new Vector(this.pos.x, this.pos.y);
   } 

   updateSpring(time = 1) {
      this.spring += this.springSpeed * time;
   }

   getSpringVector() {
      return new Vector(0, Math.sin(this.spring) * this.springDist);
   }

   getNextPosition(time = 1) {
      this.updateSpring(time);

      return this.startPos.plus(this.getSpringVector(time));
   }

   act(time) {
      this.pos = this.getNextPosition(time);
   }
}

Object.defineProperty(Coin.prototype, 'type', {
      value: 'coin',
});

class Fireball extends Actor {
   constructor(pos, speed) {
      super(pos, undefined, speed);
   }

   getNextPosition(time = 1) {
      return this.pos.plus(this.speed.times(time));
   }

   handleObstacle() {
      this.speed = this.speed.times(-1);
   }

   act(time, level) {
      let pos = this.getNextPosition(time);

      if (level.obstacleAt(pos, this.size)) {
            this.handleObstacle();
      } else {
            this.pos = pos;
      }
   }
}

Object.defineProperty(Fireball.prototype, 'type', {
      value: 'fireball',
});

class HorizontalFireball extends Fireball {
   constructor(pos = new Vector(0,0)) {
      super(pos, new Vector(2, 0));
   }
}

class VerticalFireball extends Fireball {
   constructor(pos = new Vector(0, 0)) {
      super(pos, new Vector(0, 2));
   }
}

class FireRain extends Fireball {
   constructor(pos = new Vector()) {
      super(pos, new Vector(0, 3));

      this.startPos = new Vector(pos.x, pos.y);
   }

   handleObstacle() {
      this.pos = this.startPos.times(1);
   }
}

class Level {
   constructor(grid, actors = []) {
      this.height = (grid) ? grid.length : 0;
      this.width = (grid && grid[0]) ? grid[0].length : 0;
      this.status = null;
      this.finishDelay = 1;
      this.actors = actors;

      this.grid = grid;

      this.player = null;

      for (let i = 0; i < actors.length; i++) {
         if (actors[i].type === 'player') {
            this.player = actors[i];
            break;
         }
      }

   }

   isFinished() {
      if (this.status !== null && this.finishDelay < 0) {
         return true;
      }

      return false;
   }

   actorAt(actor) {
      if ( !(actor && actor instanceof Actor) ) {
         throw new SyntaxError("Agrument is wrong");
      }

      for (let i = 0; i < this.actors.length; i++) {
         if (actor.isIntersect(this.actors[i])) {
            return this.actors[i];
         }
      }

   }

   obstacleAt(position, size) {
      let checkArguments = position && size
         && position instanceof Vector
         && size instanceof Vector

      if (!checkArguments) {
         throw new SyntaxError("Agrument is wrong");
      }

      let pos = new Actor(position);

      let wall = pos.left < 0 
         || pos.top < 0
         || pos.right > this.width;
      if (wall) return 'wall';

      if (pos.bottom > this.height) {
            return 'lava';
      }

      for (let y = 0; y < this.grid.length; y++) {
            for (let x = 0; x < this.grid[y].length; x++) {
                  let type = this.grid[y][x];
             
                  if (type === 'wall' || type === 'lava') {
                        let intersect = isIntersectRect(
                              pos.left, pos.right, pos.top, pos.bottom, 
                              x + 0.2, x + 1, y, y + 1
                        );                        

                        if (intersect) return type;
                  }
            }
      }
   }

   noMoreActors(type) {
      if (!type) return !this.actors.length;

      for (let i = 0; i < this.actors.length; i++) {
         if (this.actors[i].type === type) return false;
      }

      return true;
   }

   removeActor(actor) {
      for (let i = 0; i < this.actors.length; i++) {
         if (this.actors[i] === actor) {
            this.actors.splice(i, 1);
            return;
         };
      }

   }

   playerTouched(type, actor) {
      if (type === 'lava' || type === 'fireball') {
         this.status = 'lost';
         return;
      } 

      if (type === 'coin') {
         this.removeActor(actor);
      }

      var won = true;

      for (let i = 0; i < this.actors.length; i++) {
         if (this.actors[i].type === 'coin') {
            won = false;
            return;
         };
      }

      if (won) this.status = 'won';
   }
}

class LevelParser {
   constructor(actorCodes = {}) {
      this.actorCodes = actorCodes;
   }

   actorFromSymbol(symbol) {
      return this.actorCodes[symbol]; 
   }

   obstacleFromSymbol(symbol) {
      if (symbol === 'x') return 'wall';
      else if (symbol === '!') return 'lava';
   }

   createGrid(plan) {
      return plan.map((str) => {
         return str.split('').map(symbol => {
            return this.obstacleFromSymbol(symbol)
         });
      });
   }

   createActors(plan) {
      let actors = [];
      
      plan.forEach((str, y) => {
         str.split('').forEach((symbol, x) => {
            let constr = this.actorCodes[symbol];
            if ( !(typeof constr === 'function' && new constr instanceof Actor) ) return; 

            actors.push(new constr(new Vector(x, y)));
         });
      });

      return actors;
   }

   parse(plan) {
      return new Level(
         this.createGrid(plan),
         this.createActors(plan)
      );
   }
}

//other functions
function isIntersectRect(ax1, ax2, ay1, ay2, bx1, bx2, by1, by2) {
      return isIntersectLines(ax1, ax2, bx1, bx2)
         && isIntersectLines(ay1, ay2, by1, by2);
}

function isIntersectLines(a1, a2, b1, b2) {
   if (a1 === b1 && a2 == b2) return true;

   return (b1 > a1 === b1 < a2) 
      || (b2 > a1 === b2 < a2) 
      || (a1 > b1 === a1 < b2) 
      || (a2 > b1 === a2 < b2);
}

const actorDict = {
      '@': Player,
      'o': Coin,
      '=': HorizontalFireball,
      '|': VerticalFireball,
      '*': FireRain,
}

loadLevels().then((json) => {
      let schemas = JSON.parse(json);
      start(schemas);
}, () => {
      console.error('Не удалось загрузить уровни');
});

function start(schemas) {
      const parser = new LevelParser(actorDict);

      runGame(schemas, parser, DOMDisplay).then(() => {
            alert('You won!');
      });
}

























































