var projectileImage = new Image();
projectileImage.src = "projectile.png";

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

function timeIt(callback){
    var time = performance.now();
    callback();
    return performance.now() - time;
}

var Drawable = function(){
    this.image = new Image();
    this.x = null;
    this.y = null;
    this.rotation = 0;
    this.rot_inc = 0;
}
Drawable.prototype = {
    Draw: function(){
        //Game.ctx.fillRect(this.x, this.y, 10, 10);
        if(this.x == null || this.x == 'NaN' || this.y == null || this.y == 'NaN'){
            console.log("Trying to draw something invalid");
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

var Projectile = function(argX, argY){
    this.x = argX;
    this.y = argY;
    this.image = projectileImage;
    this.rot_inc =  Math.random() * 5 + 10;
}
Projectile.prototype = new Drawable();
Projectile.prototype.constructor = Projectile;
Projectile.prototype.Physics = function(){
    // projectile physics function
    this.y -= 5;
    if(this.y < -20) return false;
    return true;
}

var PlayerShip = function(argX, argY){
    this.x = argX;
    this.y = argY;
    this.image.src = "projectile.png";
}
PlayerShip.prototype = new Drawable();
PlayerShip.prototype.constructor = PlayerShip;
PlayerShip.prototype.Physics = function(){
    this.x = Game.mouse.x;
    this.y = Game.mouse.y;
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
    canvas_tag:         	document.getElementById("draw_canvas"),
    ctx:                	document.getElementById("draw_canvas").getContext("2d"),
    physics_timer:      	7,
    draw_timer:      		15,
    draw_loop_handle: 		null,
    physics_loop_handle: 	null,
    player:                 new PlayerShip(500, 400),
    projectiles:            [],
    num_projectiles:        1000,
    width:                  1000,
    height:                 800,
    mouse:{
            x:              null,
            y:              null
    },

    // public functions
    Initialize: 	function(){

        Game.canvas_tag.addEventListener('mousemove', function(evt) {
            var rect = Game.canvas_tag.getBoundingClientRect();
            Game.mouse.x =  evt.clientX - rect.left;
            Game.mouse.y =  evt.clientY - rect.top;
        }, false);

        //Touch event here
        Game.canvas_tag.addEventListener('touchmove', function(evt) {
            var rect = Game.canvas_tag.getBoundingClientRect();
            Game.mouse.x =  evt.clientX - rect.left;
            Game.mouse.y =  evt.clientY - rect.top;
        }, false);
    
    	// initialize game loops
    	Game.physics_loop_handle = setInterval(Game.Physics, Game.physics_timer);
    	Game.draw_loop_handle = setInterval(Game.Draw, Game.draw_timer);
    },

    Draw: 	function(){
        Game.ctx.clearRect(0, 0, 800, 600);
        for(var i = 0; i < Game.projectiles.length; i++){
            Game.projectiles[i].Draw();
        }
        Game.player.Draw();
    },

    Physics: 	function(){
        for(var i = 0; i < Game.projectiles.length; i++){
            if( ! Game.projectiles[i].Physics() ){
                Game.projectiles.splice(i, 1);
                i--;
            }
        }
        Game.projectiles.push(new Projectile(Game.mouse.x-12, Game.mouse.y-12));
        Game.player.Physics();
        
    },

    PrintPoints: function(){
    	var curr = Game.points.head;
    	Game.ctx.clearRect(0, 0, 800, 600);
    	Game.ctx.fillStyle = "rgba(255,255,255,0.05)";
    	Game.ctx.fillRect(0,0,1000,800);
    	Game.ctx.beginPath();

    	for(var pos = 0; pos < Game.points.point_array.length-1 && Game.points.point_array.length > 1; pos++){
    		var curr = Game.points.point_array[pos];
    		var next = Game.points.point_array[pos+1];

    		Game.ctx.strokeStyle = "#000000";
	      	Game.ctx.moveTo(curr.x * 1000, curr.y * 100 + 400);
	      	Game.ctx.lineTo(next.x * 1000, next.y * 100 + 400);
    	}

    	Game.ctx.stroke();
    }

};

Game.canvas_tag.focus();

Game.Initialize(); 



