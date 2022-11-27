import * as THREE from 'three';
import { OrbitControls } from 'https://unpkg.com/three@0.141.0/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'https://unpkg.com/three@0.141.0/examples/jsm/libs/lil-gui.module.min.js'; 

// import fragment from './shaders/fragment.glsl'
// import vertex from './shaders/vertex.glsl'
// import mask1 from './images/star.png'
// import mask2 from './images/franky.png'
// import mask3 from './images/myth.png'
let mask1 = document.querySelector('.mask1').src
let mask2 = document.querySelector('.mask2').src
let mask3 = document.querySelector('.mask3').src

export default class Sketch {
    constructor() {

        this.renderer = new THREE.WebGLRenderer( { antialias: true,alpha:true } );
        this.renderer.setSize( window.innerWidth, window.innerHeight );
        // this.renderer.setAnimationLoop( animation );
        document.getElementById("container").appendChild( this.renderer.domElement );

        this.camera = new THREE.PerspectiveCamera( 35, window.innerWidth / window.innerHeight, 0.1, 6000 );
        this.camera.position.z = 1500;

        this.scene = new THREE.Scene();
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.point = new THREE.Vector2();

        this.textures = [
            new THREE.TextureLoader().load(mask2),
            new THREE.TextureLoader().load(mask3),
        ]
        this.mask = new THREE.TextureLoader().load(mask1)

        // this.controls = new OrbitControls(this.camera,this.renderer.domElement)
        this.time = 0;
        this.move = 0;
        this.addMesh();
        this.render();
        this.settings();
        this.mouseEffects()
        this.windowResize();
    }

    settings(){
        let that = this;
        this.settings = {
            progress:0,
        }
        this.gui = new GUI();
        this.gui.add(this.settings,"progress",0,10,0.01)
    }

    mouseEffects() {
        this.test = new THREE.Mesh(
            new THREE.PlaneBufferGeometry(2000,2000),
            new THREE.MeshBasicMaterial()
        )

        window.addEventListener("mousedown",(e) => {
            gsap.to(this.material.uniforms.mousePressed,{
                ease:"elastic.out(1,0.3)",
                duration:0.5,
                value:1
            })
        })

        window.addEventListener("mouseup",(e) => {
            gsap.to(this.material.uniforms.mousePressed,{
                duration:0.5,
                ease:"elastic.out(1,0.3)",
                value:0
            })
        })

        window.addEventListener("mousewheel",(e) => {
            this.move += e.wheelDeltaY/1000;
        })
        window.addEventListener("mousemove",(event) => {
            this.mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
            this.mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

            this.raycaster.setFromCamera( this.mouse, this.camera );

            // calculate objects intersecting the picking ray
            // const intersects = this.raycaster.intersectObjects( this.scene.children );
            const intersects = this.raycaster.intersectObjects( [this.test] );
            // console.log(intersects[0].point)

            this.point.x = intersects[0].point.x
            this.point.y = intersects[0].point.y

        },false);
    }

    addMesh() {
        this.material = new THREE.ShaderMaterial({
            // fragmentShader:document.getElementById( 'fragmentshader' ).textContent,
            // vertexShader:document.getElementById( 'vertexshader' ).textContent,
            fragmentShader: `
                varying vec2 vCoordinates;
                varying vec3 vPos;

                uniform sampler2D t1;
                uniform sampler2D t2;
                uniform sampler2D mask;
                uniform float move;

                void main() {
                    vec4 maskTexture = texture2D(mask,gl_PointCoord);
                    vec2 myUV = vec2(vCoordinates.x/512.,vCoordinates.y/512.);
                    // vec4 image = texture2D(t1,myUV);
                    vec4 tt1 = texture2D(t1,myUV);
                    vec4 tt2 = texture2D(t2,myUV);

                    // vec4 final = mix(tt1,tt2,fract(move));
                    vec4 final = mix(tt1,tt2,smoothstep(0.,1.,fract(move)));

                    float alpha = 1. - clamp(0.,1.,abs(vPos.z/900.));
                    // gl_FragColor = vec4(vCoordinates.x/512.,1.,0.,1.);
                    // gl_FragColor = image;
                    gl_FragColor = final;
                    // gl_FragColor = maskTexture;

                    gl_FragColor.a *=maskTexture.r*alpha;
                    // gl_FragColor = vec4(alpha);


                }
            `,
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vPos;
                varying vec2 vCoordinates;
                attribute vec3 aCoordinates;
                attribute float aSpeed;
                attribute float aOffset;
                attribute float aDirection;
                attribute float aPress;
                
                // uniform sampler2D t1;
                // uniform sampler2D t2;
                uniform float move;
                uniform float time;
                uniform vec2 mouse;
                uniform float mousePressed;
                uniform float transition;

                void main () {
                    vUv = uv;
                    vec3 pos = position;
                    // NOT STABLE
                    pos.x += sin(move*aSpeed)*3.;
                    pos.y += sin(move*aSpeed)*3.;
                    
                    // Use this for noninfinity scrollingWheel
                    // pos.z = position.z + move*20.*aSpeed + aOffset;

                    // Use mod for infinity scrollingWHeel.
                    // pos.z = mod(position.z + move*20.*aSpeed + aOffset,2000.) - 1000.;
                    pos.z = mod(position.z + move*200.*aSpeed + aOffset,2000.) - 1000.;


                    //STABLE
                    vec3 stable = position;
                    float dist = distance(stable.xy,mouse);
                    float area = 1. - smoothstep(0.,300.,dist);

                    stable.x += 50.*sin(0.1 * time * aPress)*aDirection*area*mousePressed;
                    stable.y += 50.*sin(0.1 * time * aPress)*aDirection*area*mousePressed;
                    stable.z += 200.*cos(0.1 * time * aPress)*aDirection*area*mousePressed;

                    pos = mix(pos,stable,transition);

                    // vec4 mvPosition = modelViewMatrix * vec4( position , 1.);
                    
                    // For non stable position
                    vec4 mvPosition = modelViewMatrix * vec4( pos , 1.);

                    // For stable position;
                    // vec4 mvPosition = modelViewMatrix * vec4( stable , 1.);

                    gl_PointSize = 4000. * (1. / - mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;

                    vCoordinates = aCoordinates.xy;
                    vPos = pos;


                }
            `,
            uniforms:{
                progress:{
                    type:"f",value:0
                },
                t1 : {type:"t",value:this.textures[0]},
                t2 : {type:"t",value:this.textures[1]},
                mask: {type:"t",value:this.mask},
                mousePressed: {type:"f",value:0},
                mouse:{type:"v2",value:null},
                transition:{type:"f2",value:null},
                move: {type:"f",value:0},
                time: {type:"f",value:0},
            
                side:THREE.DoubleSide
            },
            transparent:true,
            depthTest:false,
            depthWrite:false,
        })
        // this.geometry = new THREE.PlaneBufferGeometry( 1000,1000,10,10);
        this.geometry = new THREE.BufferGeometry();
        let number = 512 * 512;

        this.positions = new THREE.BufferAttribute(
            new Float32Array(number*3),3
        )
        this.coordinates = new THREE.BufferAttribute(
            new Float32Array(number*3),3
        )
        this.speeds = new THREE.BufferAttribute(
            new Float32Array(number*3),1
        )
        this.offset = new THREE.BufferAttribute(
            new Float32Array(number*3),1
        )
        this.direction = new THREE.BufferAttribute(
            new Float32Array(number*3),1
        )
        this.press = new THREE.BufferAttribute(
            new Float32Array(number*3),1
        )
        function rand(a,b) {
            return a + (b-a)*Math.random()
        }

        let index = 0;
        for (let i = 0; i < 512; i++) {
            let posX = i - 256
            for (let j = 0; j < 512; j++) {
                let posY = j - 256
                this.positions.setXYZ(
                    index,posX*2,posY*2,0
                )
                this.coordinates.setXYZ(index,i,j,0)
                this.offset.setX(index,rand(-1000,1000))
                this.speeds.setX(index,rand(0.4,1))
                this.direction.setX(index,Math.random() > 0.5 ? 1: -1)
                this.press.setX(index,rand(0.4,1))
                index ++;
            }
        }

        this.geometry.setAttribute("position",this.positions)
        this.geometry.setAttribute("aCoordinates",this.coordinates)
        this.geometry.setAttribute("aOffset",this.offset)
        this.geometry.setAttribute("aSpeed",this.speeds)
        this.geometry.setAttribute("aPress",this.press)
        this.geometry.setAttribute("aDirection",this.direction)

        // this.material = new THREE.MeshNormalMaterial({side:THREE.DoubleSide});
        this.mesh = new THREE.Points( this.geometry, this.material );
        this.scene.add( this.mesh );
    }

    render() {
        this.time++;

        let next = Math.floor(this.move + 40) % 2;
        let prev = ( Math.floor(this.move) + 1 + 40) % 2;
        
        this.material.uniforms.t1.value = this.textures[prev];
        this.material.uniforms.t2.value = this.textures[next];
        this.material.uniforms.time.value = this.time;
        this.material.uniforms.transition.value = this.settings.progress;
        this.material.uniforms.move.value = this.move;
        // this.material.uniforms.mouse.value = this.mouse;
        this.material.uniforms.mouse.value = this.point;

        this.renderer.render( this.scene, this.camera );

        // console.log(this.time)
        window.requestAnimationFrame(this.render.bind(this))
    }

    windowResize() {
        window.addEventListener("resize",() => {
            this.renderer.setSize(window.innerWidth,window.innerHeight)
            this.camera.aspect = window.innerWidth/window.innerHeight
            this.camera.updateProjectionMatrix()
        })
    }
}

new Sketch()