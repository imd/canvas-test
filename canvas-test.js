var NUM_BALLS      =  5;
var BALL_DIAMETER  = 16;
var BALL_SPEED     =  2;
var BALL_COLOR     = "#592f2d";
var BALL_SPRITE    = new Image();
BALL_SPRITE.src    = 'images/spinning-globe.png';
var GUN_LENGTH     = 44;
var GUN_WIDTH      = 14;
var GUN_COLOR      = "#9dacb2";
var GUN_SPRITE_H   = new Image();
GUN_SPRITE_H.src   = 'images/gun-horiz.png';
var GUN_SPRITE_V   = new Image();
GUN_SPRITE_V.src   = 'images/gun-vert.png';
var BARRIER_WIDTH  = GUN_WIDTH - 4;
var TICK_LENGTH_MS = 10;

var CANVAS;
var CTX;
var WIDTH;
var HEIGHT;
var MIN_X;
var MIN_Y;
var MAX_X;
var MAX_Y;
var FUTURE;
var CUR_FUTURE = 0;
var NUM_FUTURES = 100;
var WORLD;
var TICK = 0;
var DRAW_INTERVAL;
var PAUSED = false;

/**
 * Restrict b to the range [a, c].
 */
function restrict_range(n, a, b) {
    if (a > b) {
        throw 'restrict_range called with bad args: ' + n + ', ' + a + ', ' + b;
    }
    return (n < a ? a :
            n > b ? b :
            n);
}

function cartesian_to_polar(x, y) {
    return {magnitude: Math.sqrt(x*x + y*y),
            angle:     Math.atan2(y, x)};
}

function polar_to_cartesian(magnitude, angle) {
    return {x: magnitude * Math.cos(angle),
            y: magnitude * Math.sin(angle)};
}

/* Choose an element from an Array at random */
function random_elt(choices) {
    return choices[Math.floor(Math.random() * choices.length)];
}

function Ball(x, y, radius, speed, heading, color, img) {
    this.x = restrict_range(x, radius, WIDTH - radius);
    this.y = restrict_range(y, radius, HEIGHT - radius);
    this.radius = radius;
    this.speed = speed;
    this.heading = heading;
    this.color = color || "#000";
    if (img) {
        this.use_sprite = true;
        this.img = img;
        this.img.frame_size = this.radius * 2;
        this.img.num_frames = this.img.width / this.img.frame_size;
        this.img.frame = Math.floor(Math.random() * this.img.num_frames);
    }
    this.update_cartesian();
}

Ball.prototype.update_cartesian = function () {
    var cartesian = polar_to_cartesian(this.speed, this.heading);
    this.dx = cartesian.x;
    this.dy = cartesian.y;
};

Ball.prototype.update_polar = function () {
    var polar = cartesian_to_polar(this.dx, this.dy);
    this.speed = polar.magnitude;
    this.heading = polar.angle;
};

Ball.prototype.set_pos = function (x, y) {
    this.x = x;
    this.y = y;
};

Ball.prototype.handle_wall_collisions = function () {
    var x = this.x,
        y = this.y,
        radius = this.radius;

    if (x + radius > WIDTH || x - radius < 0) {
        this.dx = -this.dx;
    }
    if (y + radius > HEIGHT || y - radius < 0) {
        this.dy = -this.dy;
    }
};

Ball.prototype.handle_ball_collisions = function (other) {
    var dist_x, dist_y, radii;

    if (this === other) {
        return;
    }
    dist_x = other.x - this.x;
    dist_y = other.y - this.y;
    radii = this.radius + other.radius;
    // Compare the square of the distance with the square of the combined
    // radii.  If the former is <= the latter, balls intersect.
    if (dist_x * dist_x + dist_y * dist_y <= radii * radii) {
        // If ball is hitting the top or bottom of the other
        /*
               |       | other
               +-------+
                   ^
                   |     ball center is between other's left and right edges
               +-------+
               |       | this
         */
        if (   this.x >= other.x - other.radius
            && this.x <= other.x + other.radius) {
            this.dx = -this.dx;
        }
        // If ball is hitting the side of the other
        if (   this.y >= other.y - other.radius
            && this.y <= other.y + other.radius) {
            this.dy = -this.dy;
        }
    }
};

Ball.prototype.collide = Ball.prototype.handle_ball_collisions;

function le() {
    var i;

    for (i = 1; i < arguments.length; i++) {
        if (arguments[i - 1] > arguments[i]) {
            return false;
        }
    }
    return true;
}

Ball.prototype.handle_filled_collisions = function (fa) {
    var x1 = this.x - this.radius,
        x2 = this.x + this.radius,
        y1 = this.y - this.radius,
        y2 = this.y + this.radius;
    // If ball is hitting the top or bottom of the filled area
    if ((le(fa.y1, y1, fa.y2) || le(fa.y1, y2, fa.y2))
        && this.radius >= fa.x1 && this.radius <= fa.x2) {
        this.dy = -this.dy;
    }
    // If ball is hitting a side of the filled area
    if ((le(fa.x1, x1, fa.x2) || le(fa.x1, x2, fa.x2))
        && this.radius >= fa.y1 && this.radius <= fa.y2) {
        this.dx = -this.dx;
    }
};

Ball.prototype.move = function () {
    this.x += this.dx;
    this.y += this.dy;
};

Ball.prototype.draw = function () {
    if (!this.use_sprite) {
        CTX.fillStyle = this.color;
        CTX.beginPath();
        CTX.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, true);
        CTX.closePath();
        CTX.fill();
    } else {
        var img = this.img;

        CTX.drawImage(
            img,

            img.frame * img.frame_size,
            0,
            img.frame_size,
            img.frame_size,

            this.x - img.frame_size / 2,
            this.y - img.frame_size / 2,
            img.frame_size,
            img.frame_size);
        if (TICK % 10 === 0) {
            img.frame = (img.frame + 1) % img.num_frames;
        }
    }
};

Ball.prototype.draw_wireframe = function () {
    CTX.fillStyle = "rgba(0, 0, 255, 0.5)";
    CTX.beginPath();
    CTX.arc(this.x, this.y, 1.5, 0, 2 * Math.PI, true);
    CTX.closePath();
    CTX.fill();
};

function Gun(x, y, horizontal_p, color, use_sprite) {
    this.x = x;
    this.y = y;
    this.horizontal_p = horizontal_p;
    this.w = horizontal_p ? GUN_LENGTH : GUN_WIDTH;
    this.h = horizontal_p ? GUN_WIDTH : GUN_LENGTH;
    this.color = color || "#000";
    this.use_sprite = use_sprite || true;
    this.sprite_h = GUN_SPRITE_H;
    this.sprite_v = GUN_SPRITE_V;
}

Gun.prototype.draw = function () {
    if (!this.use_sprite) {
        CTX.fillStyle = this.color;
        CTX.beginPath();
        CTX.fillRect(this.x - (this.w / 2), this.y - (this.h / 2),
                     this.w, this.h);
        CTX.closePath();
        CTX.fill();
    } else {
        var img = (this.horizontal_p) ? this.sprite_h : this.sprite_v;

        CTX.drawImage(
            img,
            0, 0, img.width, img.height,
            this.x - (img.width / 2), this.y - (img.height / 2),
            img.width, img.height);
    }
};

/* Put gun under mouse */
function update_gun_pos(evt) {
  if (   evt.pageX > MIN_X && evt.pageX < MAX_X
      && evt.pageY > MIN_Y && evt.pageY < MAX_Y) {
      WORLD.gun.x = evt.pageX - MIN_X;
      WORLD.gun.y = evt.pageY - MIN_Y;
  }
}

function keydown_handler(evt) {
    var tmp;

    switch (evt.keyCode) {
    case 32:
        /* Flip gun on space bar press */
        WORLD.gun.horizontal_p = !WORLD.gun.horizontal_p;
        tmp = WORLD.gun.w;
        WORLD.gun.w = WORLD.gun.h;
        WORLD.gun.h = tmp;
        break;
    }
}

function FilledArea(x1, x2, y1, y2, color) {
    this.x1 = x1;
    this.x2 = x2;
    this.y1 = y1;
    this.y2 = y2;
    this.color = color || "#000";
}

FilledArea.prototype.draw = function () {
    CTX.fillStyle = this.color;
    CTX.beginPath();
    CTX.fillRect(this.x1, this.y1, this.x2 - this.x1, this.y2 - this.y1);
    CTX.closePath();
    CTX.fill();
};

function in_filled_area(x, y) {
    var i, fa;

    if (x < 0 || x > WIDTH || y < 0 || y > HEIGHT) {
        return true;
    }
    for (i = 0; i < WORLD.filled_areas.length; i++) {
        fa = WORLD.filled_areas[i];
        if (x > fa.x1 && x < fa.x2 && y > fa.y1 && y < fa.y2) {
            return fa;
        }
    }
    return false;
}

function Barrier(world, x, y, horizontal_p, speed, color) {
    this.world = world;
    this.x1 = x;
    this.x2 = x;
    this.y1 = y;
    this.y2 = y;
    this.horizontal_p = horizontal_p;
    this.speed = speed;
    this.color = color || "#ccc";
    if (horizontal_p) {
        this.y1 -= BARRIER_WIDTH / 2;
        this.y2 += BARRIER_WIDTH / 2;
    } else {
        this.x1 -= BARRIER_WIDTH / 2;
        this.x2 += BARRIER_WIDTH / 2;
    }
}

Barrier.prototype.save = function () {
    this.world.filled_areas.push(
        new FilledArea(this.x1, this.x2, this.y1, this.y2));
    this.world.barrier = null;
};

Barrier.prototype.move = function () {
    var end1 = in_filled_area(this.x1, this.y1),
        end2 = in_filled_area(this.x2, this.y2);
    if (end1 && end2) {
        this.save();
    } else if (this.horizontal_p) {
        if (!end1) this.x1 -= this.speed;
        if (!end2) this.x2 += this.speed;
    } else {
        if (!end1) this.y1 -= this.speed;
        if (!end2) this.y2 += this.speed;
    }
};

Barrier.prototype.draw = function () {
    CTX.fillStyle = this.color;
    CTX.beginPath();
    CTX.fillRect(this.x1, this.y1, this.x2 - this.x1, this.y2 - this.y1);
    CTX.closePath();
    CTX.fill();
};

function create_barrier(x, y) {
    if (!WORLD.barrier) {
        WORLD.barrier = new Barrier(WORLD, x, y, WORLD.gun.horizontal_p,
                                    BALL_SPEED);
    }
}

function mousedown_handler(evt) {
    var x, y;

    /// if click is within canvas, translate to canvas coordinates
    if (evt.pageX > MIN_X && evt.pageX < MAX_X
        && evt.pageY > MIN_Y && evt.pageY < MAX_Y) {
        x = evt.pageX - MIN_X;
        y = evt.pageY - MIN_Y;
        switch (evt.which) {
        case 1: //left button
            create_barrier(x, y);
            break;
    }
}

function World(balls, filled_areas, gun, barrier) {
    this.balls = balls;
    this.filled_areas = filled_areas;
    this.gun = gun;
    this.barrier = barrier;
}

World.prototype.clone = function () {
    function clone_array(arr) {
        return arr.map(function(obj) {return Object.create(obj);});
    }
    var w = new World(clone_array(this.balls),
                      clone_array(this.filled_areas),
                      Object.create(this.gun),
                      this.barrier ? Object.create(this.barrier) : undefined);
    if (w.barrier) {
        w.barrier.world = w;
    }
    return w;
};

World.prototype.move = function () {
    var i, j, new_world, ball1, ball2, fa;

    /*
      (move balls)
      (collide balls walls)
      (collide balls filled-areas)
      (collide balls barrier)
      (collide balls)
     */
    for (i = 0; i < this.balls.length; i++) {
        ball1 = this.balls[i];
        ball1.move();
        ball1.handle_wall_collisions();
        fa = in_filled_area(ball1.x, ball1.y);
        if (fa) {
            ball1.handle_filled_collisions(fa);
        }
        if (this.barrier) {
            ball1.handle_filled_collisions(this.barrier);
        }
    }
    for (i = 0; i < this.balls.length; i++) {
        ball1 = this.balls[i];
        for (j = i + 1; j < this.balls.length; j++) {
            ball2 = this.balls[j];
            ball1.handle_ball_collisions(ball2);
        }
    }
    if (this.barrier) {
        this.barrier.move();
    }
    ++TICK;
};

World.prototype.draw = function () {
    var i, ball;

    CTX.clearRect(0, 0, WIDTH, HEIGHT);
    for (i = 0; i < this.balls.length; i++) {
        ball = this.balls[i];
        ball.draw();
    }
    if (this.barrier) {
        this.barrier.draw();
    }
    for (i = 0; i < this.filled_areas.length; i++) {
        this.filled_areas[i].draw();
    }
    this.gun.draw();
};

World.prototype.move_and_draw = function() {
    this.move();
    this.draw();
};

function make_futures() {
    var world, i;

    FUTURE = [];
    world = WORLD;
    for (i = 0; i < NUM_FUTURES; i++) {
        FUTURE.push(world);
        world = world.clone();
        world.move();
    }
}

function draw_paused() {
    var i, j;

    CTX.clearRect(0, 0, WIDTH, HEIGHT);
    for (i = 0; i < WORLD.balls.length; i++) {
        for (j = 0; j < NUM_FUTURES; j++) {
            FUTURE[j].balls[i].draw_wireframe();
        }
        FUTURE[CUR_FUTURE].balls[i].draw();
    }
    if (WORLD.barrier) {
        WORLD.barrier.draw();
    }
    for (i = 0; i < WORLD.filled_areas.length; i++) {
        WORLD.filled_areas[i].draw();
    }
}

function init_world() {
    var balls = [];
    var gun;
    var filled_areas;
    var i;

    for (i = 0; i < NUM_BALLS; i++) {
        balls.push(new Ball(
            Math.random() * WIDTH, Math.random() * HEIGHT, BALL_DIAMETER / 2,
            BALL_SPEED, 2 * Math.PI * Math.random(), BALL_COLOR, BALL_SPRITE));
    }
    gun = new Gun(WIDTH / 2, HEIGHT / 2, true, GUN_COLOR);
    filled_areas =
        [new FilledArea(-10, 0, -10, HEIGHT + 10),
         new FilledArea(WIDTH, WIDTH + 10, -10, HEIGHT + 10),
         new FilledArea(WIDTH - 10, WIDTH + 10, -10, 0),
         new FilledArea(WIDTH - 10, WIDTH + 10, HEIGHT, HEIGHT + 10)];
    WORLD = new World(balls, filled_areas, gun);
}

function toggle_pause() {
    if (PAUSED) {
        PAUSED = false;
        DRAW_INTERVAL = setInterval(WORLD.move_and_draw.bind(WORLD),
                                    TICK_LENGTH_MS);
        CANVAS.style.cursor = 'none';
    } else {
        PAUSED = true;
        clearInterval(DRAW_INTERVAL);
        make_futures();
        draw_paused();
        CANVAS.style.cursor = 'auto';
    }
}

function init_buttons() {
    $("#play_pause").click(toggle_pause);
    $("#step").click(WORLD.move_and_draw.bind(WORLD));
    $("#reset").click(function () {
        init_world();
        this.blur();
    });
    $("#future")
        .attr({"min": 0, "max": NUM_FUTURES - 1, "value": 0})
        .change(function () {
            CUR_FUTURE = parseInt(this.value, 10);
            draw_paused();
        });
}

function FPS() {
    $('#tick').html(TICK + " FPS");
    TICK = 0;
}

function init() {
    $(document).mousemove(update_gun_pos);
    $(document).mousedown(mousedown_handler);
    $(document).keydown(keydown_handler);
    CANVAS = $("#canvas")[0];
    CTX = CANVAS.getContext("2d");
    WIDTH = CANVAS.width;
    HEIGHT = CANVAS.height;
    MIN_X = $("#canvas").offset().left;
    MIN_Y = $("#canvas").offset().top;
    MAX_X = MIN_X + WIDTH;
    MAX_Y = MIN_Y + WIDTH;
    init_world();
    init_buttons();
    setInterval(FPS, 1000);
    if (DRAW_INTERVAL) {
        clearInterval(DRAW_INTERVAL);
    }
    DRAW_INTERVAL = setInterval(WORLD.move_and_draw.bind(WORLD),
                                TICK_LENGTH_MS);
}
