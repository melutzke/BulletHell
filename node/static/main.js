var projectileImage = new Image();
projectileImage.src = "static/projectile.png"; // this kills the crab

var enemy1Image = new Image();
enemy1Image.src = "static/enemy_ship_1.gif"

var playerImage = new Image();
playerImage.src = "static/player_ship.png";

var socket = io.connect('72.33.115.223:3000');

function catmullRomInterpolate( P0, P1, P2, P3, u ){
    var u3 = u * u * u;
    var u2 = u * u;
    var f1 = -0.5 * u3 + u2 - 0.5 * u;
    var f2 =  1.5 * u3 - 2.5 * u2 + 1.0;
    var f3 = -1.5 * u3 + 2.0 * u2 + 0.5 * u;
    var f4 =  0.5 * u3 - 0.5 * u2;
    var x = P0.x * f1 + P1.x * f2 + P2.x * f3 + P3.x * f4;
    var y = P0.y * f1 + P1.y * f2 + P2.y * f3 + P3.y * f4;

    return new Point(x, y);
}

function Point(argX, argY){
    this.x = argX;
    this.y = argY;
}

function timeIt(callback){
    var time = performance.now();
    callback();
    return performance.now() - time;
}

function distance(obj1, obj2){
    var x_diff = (obj1.x - obj1.image.width/2) - (obj2.x - obj2.image.width/2);
    var y_diff = (obj1.y - obj1.image.height/2) - (obj2.y - obj2.image.height/2);
    return Math.sqrt(Math.pow(x_diff, 2) + Math.pow(y_diff, 2));
}

var Drawable = function(){
    this.image = new Image();
    this.x = 0;
    this.y = 0;
    this.rotation = 0;
    this.rot_inc = 0;
}
Drawable.prototype = {
    Draw: function(){
        //Game.ctx.fillRect(this.x, this.y, 10, 10);
        if(this.x === null || this.x === 'NaN' || this.y === null || this.y === 'NaN'){
            console.log("Trying to draw something invalid", this);
        }
        this.rotation += this.rot_inc;
        if(this.rotation != 0){
            Game.ctx.save();   
            Game.ctx.translate(this.x + this.image.width/2, this.y + this.image.height/2);
            Game.ctx.rotate(this.rotation * Math.PI / 180); 
            Game.ctx.drawImage(this.image, -this.image.width/2, -this.image.height/2);
            Game.ctx.restore();
        } else {
            Game.ctx.drawImage(this.image, this.x - this.image.width/2, this.y - this.image.height/2);
        }
    }
};

var Projectile = function(argX, argY, argXVel, argYVel){
    this.x = argX;
    this.y = argY;
    this.x_vel = argXVel;
    this.y_vel = argYVel;
    this.image = projectileImage;
    this.rot_inc =  Math.random() * 5 + 10;
}
Projectile.prototype = new Drawable();
Projectile.prototype.constructor = Projectile;
Projectile.prototype.Physics = function(){
    // projectile physics function
    this.y += this.y_vel;
    this.x += this.x_vel;
    if(this.y < -100 || this.y > Game.height + 100 || this.x < -100 || this.x > Game.width + 100){
        return false;
    }
    return true;
}

var EnemyShip = function(){
    this.image = enemy1Image;
    this.behavior = null;
    this.last_shot_time = 0;
};
EnemyShip.prototype = new Drawable();
EnemyShip.prototype.constructor = EnemyShip;
EnemyShip.prototype.Shoot = function(){
    Game.enemy_projectiles.push(new Projectile(this.x-this.image.width/2, this.y-12-this.image.height/2, 0, 3));
};
EnemyShip.prototype.Physics = function(){
    var newPoint = this.behavior.Position();
    if(newPoint !== false){
        this.x = newPoint.x;
        this.y = newPoint.y;
    } else {
        return false;
    }

    for(var i = 0; i < Game.projectiles.length; i++){
        var dist = distance(this, Game.projectiles[i]);
        if( dist < 15 ){
            Game.projectiles.splice(i, 1);
            Game.kills++;
            return false;
        }
    }

    if( this.behavior.shoot_function() ){
        this.Shoot();
        this.last_shot_time = performance.now();
    }

    return true;
};

var EnemyBehavior = function(enemyRef, startX, startY, endX, endY, shootFunc, startVal, endVal, argDuration){
    this.self = enemyRef;
    this.start = new Point(startX, startY);
    this.end = new Point(endX, endY);
    this.duration = argDuration;
    this.shoot_function = shootFunc;
    this.time_started = null;
};
EnemyBehavior.prototype.Position = function(){
    if(this.time_started === null){
        this.time_started = performance.now();
    }
    var deltaTime = (performance.now() - this.time_started) / this.duration;
    if(deltaTime > 1){
        return false; // indicate we need to remove ourself from the array of enemies
    }
    var deltaX = (this.end.x - this.start.x) * deltaTime;
    var deltaY = (this.end.y - this.start.y) * deltaTime;
    var newX = this.start.x + deltaX;
    var newY = this.start.y + deltaY;
    return new Point(newX, newY);
};

var PlayerShip = function(argX, argY){
    this.x = argX;
    this.y = argY;
    this.image = playerImage;
    this.health = 100;
}
PlayerShip.prototype = new Drawable();
PlayerShip.prototype.constructor = PlayerShip;
PlayerShip.prototype.Physics = function(){
    this.x = Game.mouse.x;
    this.y = Game.mouse.y;

    for(var i = 0; i < Game.enemy_projectiles.length; i++){
        var dist = distance(this, Game.enemy_projectiles[i]);
        if( dist < 10 ){
            Game.enemy_projectiles.splice(i, 1);
            this.ChangeHealth(-10);
        }
    }
};
PlayerShip.prototype.ChangeHealth = function(argChange){
    this.health += argChange;
    if(this.health <= 0){
        this.health = 0;
        return false;
    } 
    if(this.health > 100) this.health = 100;
    return true;
};

var HealthBar = function(argX, argY, argW, argH){
    this.x = argX;
    this.y = argY;
    this.width = argW;
    this.height = argH;
}
HealthBar.prototype.Draw = function(){
    var color;
    if(Game.player.health > 66){
        color = "#00FF00";
    } else if(Game.player.health > 33) {
        color = "#FF9900";
    } else {
        color = "#FF0000";
    }
    Game.ctx.fillStyle = color;
    var height = this.height * Game.player.health/100;
    console.log(height);
    Game.ctx.fillRect(this.x, this.y + this.height * (100 - Game.player.health)/100, this.width, height);

    Game.ctx.strokeStyle = "#000000";
    Game.ctx.lineWidth = 1;
    Game.ctx.strokeRect(this.x, this.y, this.width, this.height);
}
HealthBar.prototype.Physics = function(){
}

var Node = function(dataVal, prevVal, nextVal){
    this.next = nextVal;
    this.prev = prevVal;
    this.data = dataVal;
};

Node.prototype = {
    toArray: function(){
        var new_array = [];
        var curr_node = this;
        while(curr_node != null){
            new_array.push(curr_node);
            curr_node = curr_node.next;
        }
    }
};

var Game = {
    // public variables
    canvas_tag:             document.getElementById("draw_canvas"),
    ctx:                    document.getElementById("draw_canvas").getContext("2d"),
    physics_timer:          7,
    draw_timer:             15,
    draw_loop_handle:       null,
    physics_loop_handle:    null,
    player:                 null,
    health:                 null,
    projectiles:            [],
    enemy_projectiles:      [],
    enemies:                [],
    width:                  0,
    height:                 0,
    kills:                  0,
    mouse:{
            x:              null,
            y:              null,
            last_x:         0,
            last_y:         0
    },

    // public functions
    Initialize:     function(){

        // Game.canvas_tag.addEventListener('mousemove', function(evt) {
        //     var rect = Game.canvas_tag.getBoundingClientRect();
        //     Game.mouse.x =  evt.clientX - rect.left;
        //     Game.mouse.y =  evt.clientY - rect.top;
        // }, false);

        // //Touch event here
        // Game.canvas_tag.addEventListener('touchmove', function(evt) {
        //     evt.preventDefault(); //Prevent scrolling, zooming etc for mobile
        //     //var rect = Game.canvas_tag.getBoundingClientRect();
        //     Game.mouse.x =  evt.targetTouches[0].pageX;
        //     Game.mouse.y =  evt.targetTouches[0].pageY;
        // }, false);

        Game.width = Game.canvas_tag.width;
        Game.height = Game.canvas_tag.height;
        
        Game.mouse.x = Math.round(Game.width / 2);
        Game.mouse.y = Math.round(Game.height / 2);

        Game.player = new PlayerShip(this.mouse.x, this.mouse.y);
        Game.health = new HealthBar(25, 25, 10, 550);

        socket.on('mouse_broadcast', function(mouse_coords){
            if(Game.player.health !== 0){
                Game.mouse.x = mouse_coords.x * Game.width;
                Game.mouse.y = mouse_coords.y * Game.height;
            }
        });

        // initialize game loops

        // TEMP ENEMY ADDING INTERVAL

        setInterval(function(){
            socket.emit('score', Game.kills);
        }, 1000);

        setInterval(function(){
            var newEnemy = new EnemyShip();
            var behavior = new EnemyBehavior(
                newEnemy, 
                -50, 
                200 + Math.sin(performance.now()/400) * 100, 
                850, 
                0, 
                function(){
                    if(performance.now() - this.self.last_shot_time > Math.random() * 100000
                       || (Math.abs(this.self.x - Game.player.x) < 15 && Math.random() > 0.975)){
                        return true
                    } else {
                        return false
                    };
                }, 
                0, 
                1, 
                2500
            );
            newEnemy.behavior = behavior;
            Game.enemies.push( newEnemy );
            
            newEnemy = new EnemyShip();
            behavior = new EnemyBehavior(
                newEnemy, 
                850, 
                200 + Math.sin(performance.now()/400) * 100, 
                -50, 
                0, 
                function(){
                    if(performance.now() - this.self.last_shot_time > Math.random() * 100000
                        || (Math.abs(this.self.x - Game.player.x) < 15 && Math.random() > 0.975)){
                        return true
                    } else {
                        return false
                    };
                }, 
                0, 
                1, 
                2500
            );
            newEnemy.behavior = behavior;
            Game.enemies.push( newEnemy );
        }, 250);

        setInterval(function(){
           console.log("GAME STATISTICS/////////////////////////");
           console.log("Projectiles: " + Game.projectiles.length);
           console.log("Enemy Projs: " + Game.enemy_projectiles.length);
           console.log("Enemies: " + Game.enemies.length);
           console.log("Kills: " + Game.kills);
        }, 1000);

        setInterval(function(){
            if(Game.player.health !== 0){
                Game.projectiles.push(new Projectile(Game.mouse.x-projectileImage.width/2, Game.mouse.y-12-projectileImage.height/2, 0, -5));
            }
        }, 50);

        Game.physics_loop_handle = setInterval(Game.Physics, Game.physics_timer);
        Game.draw_loop_handle = setInterval(Game.Draw, Game.draw_timer);
    },

    Draw:   function(){
        Game.ctx.clearRect(0, 0, Game.width, Game.height);
        for(var i = 0; i < Game.projectiles.length; i++){
            Game.projectiles[i].Draw();
        }
        for(var i = 0; i < Game.enemy_projectiles.length; i++){
            Game.enemy_projectiles[i].Draw();
        }
        for(var i = 0; i < Game.enemies.length; i++){
            Game.enemies[i].Draw();
        }
        Game.player.Draw();
        Game.health.Draw();
        if(Game.player.health === 0){
            Game.ctx.font="40px Georgia";
            Game.ctx.fillText("You've ceased to exist  :(",200, 300);
        }
    },

    Physics:    function(){
        for(var i = 0; i < Game.projectiles.length; i++){
            if( ! Game.projectiles[i].Physics() ){
                Game.projectiles.splice(i, 1);
                i--;
            }
        }
        for(var i = 0; i < Game.enemy_projectiles.length; i++){
            if( ! Game.enemy_projectiles[i].Physics() ){
                Game.enemy_projectiles.splice(i, 1);
                i--;
            }
        }
        for(var i = 0; i < Game.enemies.length; i++){
            if( ! Game.enemies[i].Physics() ){
                Game.enemies.splice(i, 1);
                i--;
            }
        }
        Game.player.Physics();
        Game.health.Physics();
        
    }

};

Game.canvas_tag.focus();

Game.Initialize(); 



