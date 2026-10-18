import * as THREE from "three";   // the 3D library (the importmap in index.html finds it)


// COLORS 
const COLOR = {
  skin: 0xe3ae8e, hair: 0x3a2620, cream: 0xf2ebd6, sage: 0x8a9f6a,
  sageDark: 0x5f7344, paper: 0xfbf7ea, blush: 0xe88f86, eye: 0x2a1a14
};   // all colors in one place, easy to change


const material = (color, roughness = 0.6) => new THREE.MeshStandardMaterial({ color, roughness });
// shortcut to make a material. Low roughness = shiny, high = matte (cloth)


// HELPER: make one body part 
function part(geometry, mat, position = [0, 0, 0], scale = [1, 1, 1]) {
  const mesh = new THREE.Mesh(geometry, mat);   // shape + material = mesh
  mesh.position.set(...position);               // place it [x, y, z]
  mesh.scale.set(...scale);                     // stretch/squash it [x, y, z]
  return mesh;
}


// HELPER: tube between two points (arms) 
function limb(from, to, radius, mat) {
  const start = new THREE.Vector3(...from);                      // starting point
  const direction = new THREE.Vector3(...to).sub(start);         // arrow from start to end
  const length = direction.length();                             // distance between points
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length - 2 * radius, 8, 16), mat);
  // rounded tube; the round caps add length, so subtract 2 * radius
  mesh.position.copy(start).addScaledVector(direction, 0.5);     // put it at the midpoint
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  // rotate the tube from pointing up to pointing at the end point
  return mesh;
}


// HEAD 
function buildHead() {
  const head = new THREE.Group();            // a container for all head parts
  const R = 0.27;                            // head radius
  const skin = material(COLOR.skin, 0.5);    // skin: slightly soft shine
  const hair = material(COLOR.hair, 0.4);    // hair: a bit shinier
  hair.side = THREE.DoubleSide;              // show both sides (hair is made of open half-spheres)

  head.add(part(new THREE.SphereGeometry(R, 48, 32), skin));   // the head ball (48x32 = smooth)


  //  hair (free hair, shoulder length) 
  head.add(part(new THREE.SphereGeometry(R * 1.1, 48, 32, Math.PI, Math.PI), hair, [0, -0.1, -0.07], [1.02, 1.3, 1.02]));
  // back half of a bigger sphere, moved down and stretched taller = long free hair
  const cap = part(new THREE.SphereGeometry(R * 1.04, 48, 32, 0, Math.PI * 2, 0, 1.55), hair);
  // top cap of hair (only the upper part of a sphere)
  cap.rotation.x = -0.4;                     // tilt it back so the forehead shows
  head.add(cap);                             // add only the cap (bun removed)


  // --- parts that exist on both sides (left = -1, right = +1) ---
  [-1, 1].forEach(side => {
    head.add(part(new THREE.SphereGeometry(0.045, 16, 12), skin, [side * R * 0.98, -0.01, 0], [0.6, 1, 0.8]));
    // ear: small flattened ball on the side of the head
    head.add(part(new THREE.SphereGeometry(0.032, 24, 16), material(COLOR.eye, 0.2), [side * 0.09, 0.03, 0.245], [1, 1.15, 0.5]));
    // eye: dark ball, squashed in depth (0.5) and a bit tall (1.15)
    head.add(part(new THREE.SphereGeometry(0.009, 12, 8), material(0xffffff, 0.1), [side * 0.09 + 0.01, 0.045, 0.259]));
    // eye highlight: tiny white dot, makes the eye look alive
    const brow = part(new THREE.CapsuleGeometry(0.007, 0.05, 4, 8), hair, [side * 0.09, 0.1, 0.236]);
    // eyebrow: thin capsule above the eye
    brow.rotation.z = Math.PI / 2 - side * 0.12;   // lay it sideways with a gentle slope
    head.add(brow);
    const blush = part(new THREE.SphereGeometry(0.04, 16, 12), new THREE.MeshStandardMaterial({ color: COLOR.blush, transparent: true, opacity: 0.45 }), [side * 0.15, -0.04, 0.21], [1, 0.7, 0.25]);
    // cheek blush: flat pink ball, half see-through
    blush.rotation.y = side * 0.6;                 // turn it outward to follow the cheek
    head.add(blush);
  });


  head.add(part(new THREE.SphereGeometry(0.02, 16, 12), material(0xd49b7e, 0.5), [0, -0.03, 0.262]));
  // nose: tiny ball, slightly darker skin color
  const smile = part(new THREE.TorusGeometry(0.045, 0.006, 8, 24, Math.PI), material(0xb5645a, 0.5), [0, -0.075, 0.245]);
  // smile: half a thin ring
  smile.rotation.z = Math.PI;                      // flip it so the curve points down like a smile
  head.add(smile);
  return head;                                     // give the finished head back
}


// NOTEBOOK 
function buildNotebook() {
  const book = new THREE.Group();                  // container for the notebook parts
  const ink = material(COLOR.sageDark, 0.6);       // dark green for lines and boxes
  book.add(part(new THREE.BoxGeometry(0.2, 0.26, 0.02), material(COLOR.paper, 0.8)));  // paper block
  for (let i = 0; i < 3; i++) {                    // 3 to-do rows
    const y = 0.06 - i * 0.06;                     // each row 0.06 lower than the previous
    book.add(part(new THREE.BoxGeometry(0.02, 0.02, 0.003), ink, [-0.06, y, 0.011]));  // checkbox
    book.add(part(new THREE.BoxGeometry(0.08, 0.006, 0.003), ink, [0.03, y, 0.011]));  // text line
  }
  for (let i = 0; i < 6; i++) {                    // 6 spiral rings along the top
    const ring = part(new THREE.TorusGeometry(0.012, 0.003, 6, 12), material(0x8a6f4d, 0.4), [-0.075 + i * 0.03, 0.13, 0]);
    book.add(ring);                                // each ring 0.03 to the right of the last
  }
  return book;
}


// BODY
function buildBody() {
  const body = new THREE.Group();
  const cream = material(COLOR.cream, 0.9);        // sweater: very matte
  const sage = material(COLOR.sage, 0.85);         // pinafore dress
  const skin = material(COLOR.skin, 0.5);
  sage.side = THREE.DoubleSide;                    // bib is an open shape, show both sides


  body.add(part(new THREE.CylinderGeometry(0.25, 0.27, 0.5, 40), cream, [0, 1.12, 0]));      // sweater torso
  body.add(part(new THREE.CylinderGeometry(0.11, 0.125, 0.11, 32), cream, [0, 1.42, 0]));    // turtleneck collar
  body.add(part(new THREE.CylinderGeometry(0.07, 0.07, 0.2, 24), skin, [0, 1.46, 0]));       // neck (reaches inside the head = no gap)
  body.add(part(new THREE.CylinderGeometry(0.285, 0.31, 0.3, 40), sage, [0, 1.0, 0]));       // pinafore lower part
  body.add(part(new THREE.CylinderGeometry(0.272, 0.272, 0.22, 32, 1, true, -0.7, 1.4), sage, [0, 1.26, 0]));
  // bib: only a front slice of a cylinder (start angle -0.7, length 1.4)


  [-1, 1].forEach(side => {                        // left and right
    body.add(part(new THREE.SphereGeometry(0.02, 12, 8), material(COLOR.sageDark, 0.5), [side * 0.154, 1.36, 0.224]));
    // button on the bib's top corner
    body.add(part(new THREE.SphereGeometry(0.07, 16, 12), cream, [side * 0.28, 1.3, 0]));
    // shoulder ball
  });


  // --- right arm (viewer's left) holds the pen ---
  body.add(limb([-0.28, 1.3, 0], [-0.37, 1.02, 0.1], 0.065, cream));   // upper arm: shoulder to elbow
  body.add(limb([-0.37, 1.02, 0.1], [-0.27, 1.17, 0.29], 0.06, cream)); // forearm: elbow to hand
  body.add(part(new THREE.SphereGeometry(0.05, 16, 12), skin, [-0.26, 1.2, 0.3]));  // hand
  const pen = part(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 12), material(COLOR.sageDark, 0.4), [-0.28, 1.27, 0.31]);
  pen.rotation.z = 0.5;                            // tilt the pen
  body.add(pen);


  // --- left arm (viewer's right) holds the notebook ---
  body.add(limb([0.28, 1.3, 0], [0.37, 1.02, 0.1], 0.065, cream));     // upper arm
  body.add(limb([0.37, 1.02, 0.1], [0.25, 1.12, 0.29], 0.06, cream));  // forearm
  body.add(part(new THREE.SphereGeometry(0.05, 16, 12), skin, [0.24, 1.14, 0.3]));  // hand
  const notebook = buildNotebook();                // make the notebook
  notebook.position.set(0.26, 1.27, 0.33);         // place it in the hand
  notebook.rotation.set(0, -0.3, -0.12);           // turn it slightly toward the viewer
  body.add(notebook);
  return body;
}


// SKELETON + FINAL MODEL 
export function buildMascot() {              // "export" lets script.js use this function
  const root = new THREE.Bone();             // bone 1: base
  const neck = new THREE.Bone();             // bone 2: neck
  const headBone = new THREE.Bone();         // bone 3: head (this is the one we rotate)
  neck.position.y = 1.4;                     // neck joint height
  headBone.position.y = 0.08;                // head pivot, just above the neck
  headBone.name = "Head";                    // name it so it is easy to find
  root.add(neck);                            // connect: root > neck
  neck.add(headBone);                        // connect: neck > head

  const head = buildHead();                  // build the face and hair
  head.position.y = 0.2;                     // lift it so the pivot sits at its base
  headBone.add(head);                        // attach the head to the head bone
  // when the bone rotates, the whole head (face + hair) rotates with it

  const model = new THREE.Group();           // final container
  model.add(root, buildBody());              // skeleton + body (the body is NOT on the head bone, so it stays still)
  model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  // go through every part: all of them cast and receive shadows
  return { model, headBone };                // give both back to script.js
}