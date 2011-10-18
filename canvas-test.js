var NUM_BALLS = 2;
var CTX;
var WIDTH;
var HEIGHT;
var MIN_X;
var MIN_Y;
var MAX_X;
var MAX_Y;
var CIRCLES = [];
var GUN;
var TICK = 0;

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

function Circle(x, y, radius, speed, heading) {
    this.x = restrict_range(x, radius, WIDTH - radius);
    this.y = restrict_range(y, radius, HEIGHT - radius);
    this.radius = radius;
    this.speed = speed;
    this.heading = heading;
    this.update_cartesian();
}

Circle.prototype.update_cartesian = function () {
    var cartesian = polar_to_cartesian(this.speed, this.heading);
    this.dx = cartesian.x;
    this.dy = cartesian.y;
};

Circle.prototype.update_polar = function () {
    var polar = cartesian_to_polar(this.dx, this.dy);
    this.speed = polar.magnitude;
    this.heading = polar.angle;
};

Circle.prototype.set_pos = function (x, y) {
    this.x = x;
    this.y = y;
};

Circle.prototype.handle_wall_collisions = function () {
    var x = this.x,
        y = this.y,
        radius = this.radius;

    if (x + radius > WIDTH || x - radius < 0)
        this.dx = -this.dx;
    if (y + radius > HEIGHT || y - radius < 0)
        this.dy = -this.dy;
};

Circle.prototype.handle_ball_collisions = function (other) {
    var dx, dy, radii;

    if (this == other)
        return;
    dist_x = other.x - this.x;
    dist_y = other.y - this.y;
    radii = this.radius + other.radius;
    // Compare the square of the distance with the square of the combined
    // radii.  If the former is <= the latter, balls intersect.
    if (dist_x * dist_x + dist_y * dist_y <= radii * radii) {
        // If ball is hitting the top or bottom of the other
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

Circle.prototype.move = function () {
    this.x += this.dx;
    this.y += this.dy;
};

Circle.prototype.draw = function () {
    CTX.beginPath();
    CTX.arc(this.x, this.y, this.radius, 0, 2*Math.PI, true);
    CTX.closePath();
    CTX.fill();
};

function Gun(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
}

Gun.prototype.draw = function () {
  CTX.beginPath();
  CTX.rect(this.x - (this.w / 2), this.y - (this.h / 2),
           this.w, this.h);
  CTX.closePath();
  CTX.fill();
}

function clear() {
    CTX.clearRect(0, 0, WIDTH, HEIGHT);
}

function draw() {
    var i, j, circle1, circle2;

    clear();
    for (i = 0; i < CIRCLES.length; i++) {
        circle1 = CIRCLES[i];
        circle1.move();
        circle1.handle_wall_collisions();
    }
    for (i = 0; i < CIRCLES.length; i++) {
        circle1 = CIRCLES[i];
        for (j = 0; j < CIRCLES.length; j++) {
            circle2 = CIRCLES[j];
            circle1.handle_ball_collisions(circle2);
        }
        circle1.draw();
    }
    GUN.draw();
    $('#tick').html(TICK);
    ++TICK;
}

/* Put gun under mouse */
function on_mouse_move(evt) {
  if (   evt.pageX > MIN_X && evt.pageX < MAX_X
      && evt.pageY > MIN_Y && evt.pageY < MAX_Y) {
      GUN.x = evt.pageX - MIN_X;
      GUN.y = evt.pageY - MIN_Y;
  }
}

/* Flip gun on space bar press */
function on_key_down(evt) {
    var tmp;
    if (evt.keyCode == 32) {
        tmp = GUN.w;
        GUN.w = GUN.h;
        GUN.h = tmp;
    }
}

/* Choose an element from an Array at random */
function random_elt(choices) {
    return choices[Math.floor(Math.random() * choices.length)];
}

function init() {
    var canvas = $("#canvas")[0],
        i;

    $(document).mousemove(on_mouse_move);
    $(document).keydown(on_key_down);
    CTX = canvas.getContext("2d");
    WIDTH = canvas.width;
    HEIGHT = canvas.height;
    MIN_X = $("#canvas").offset().left;
    MIN_Y = $("#canvas").offset().top;
    MAX_X = MIN_X + WIDTH;
    MAX_Y = MIN_Y + WIDTH;
    for (i = 0; i < NUM_BALLS; i++) {
        CIRCLES.push(new Circle(
            Math.random() * WIDTH,
            Math.random() * HEIGHT,
            10,
            1,
            random_elt([1, 3, 5, 7]) * Math.PI/4
        ));
    }
    GUN = new Gun(WIDTH / 2, HEIGHT / 2, 50, 10);
    return setInterval(draw, 10);
}
