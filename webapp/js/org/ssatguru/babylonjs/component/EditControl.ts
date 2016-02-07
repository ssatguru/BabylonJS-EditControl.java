"Generated from Java with JSweet 1.0.0 - http://www.jsweet.org";
module org.ssatguru.babylonjs.component {
    import AbstractMesh = BABYLON.AbstractMesh;

    import Axis = BABYLON.Axis;

    import Camera = BABYLON.Camera;

    import Color3 = BABYLON.Color3;

    import LinesMesh = BABYLON.LinesMesh;

    import Material = BABYLON.Material;

    import Matrix = BABYLON.Matrix;

    import Mesh = BABYLON.Mesh;

    import PickingInfo = BABYLON.PickingInfo;

    import Quaternion = BABYLON.Quaternion;

    import Scene = BABYLON.Scene;

    import Space = BABYLON.Space;

    import StandardMaterial = BABYLON.StandardMaterial;

    import Vector3 = BABYLON.Vector3;

    export class EditControl {
        private meshPicked: Mesh;

        private canvas: HTMLCanvasElement;

        private scene: Scene;

        private mainCamera: Camera;

        private theParent: Mesh;

        private local: boolean = true;

        private snapT: boolean = false;

        private snapR: boolean = false;

        private transSnap: number = 1;

        private rotSnap: number = Math.PI / 18;

        private axesLen: number = 0.4;

        private axesScale: number = 1;

        private redMat: StandardMaterial;

        private greenMat: StandardMaterial;

        private blueMat: StandardMaterial;

        private whiteMat: StandardMaterial;

        private yellowMat: StandardMaterial;

        private actHist: ActHist;

        private renderer: () => void;

        private pointerdown: EventListener;

        private pointerup: EventListener;

        private pointermove: EventListener;

        public constructor(mesh: Mesh, camera: Camera, canvas: HTMLCanvasElement, scale: number)  {
            this.meshPicked = mesh;
            this.canvas = canvas;
            this.axesScale = scale;
            this.scene = mesh.getScene();
            this.mainCamera = camera;
            this.actHist = new ActHist(mesh, 10);
            mesh.computeWorldMatrix(true);
            this.theParent = new Mesh("EditControl", this.scene);
            this.theParent.position = this.meshPicked.position;
            this.theParent.visibility = 0;
            this.theParent.isPickable = false;
            this.createMaterials(this.scene);
            this.createGuideAxes();
            this.guideCtl.parent = this.theParent;
            this.createPickPlane();
            this.pickPlane.parent = this.theParent;
            this.pointerdown = (evt) => { return this.onPointerDown(evt) };
            this.pointerup = (evt) => { return this.onPointerUp(evt) };
            this.pointermove = (evt) => { return this.onPointerMove(evt) };
            canvas.addEventListener("pointerdown", this.pointerdown, false);
            canvas.addEventListener("pointerup", this.pointerup, false);
            canvas.addEventListener("pointermove", this.pointermove, false);
            this.setLocalAxes(mesh);
            this.renderer = () => { return this.renderLoopProcess() };
            this.scene.registerBeforeRender(this.renderer);
        }

        private renderLoopProcess()  {
            this.setAxesScale();
            this.theParent.position = this.meshPicked.position;
            this.onPointerOver();
        }

        public switchTo(mesh: Mesh)  {
            mesh.computeWorldMatrix(true);
            this.meshPicked = mesh;
            this.setLocalAxes(mesh);
        }

        public setUndoCount(c: number)  {
            this.actHist.setCapacity(c);
        }

        public undo()  {
            this.actHist.undo();
            this.meshPicked.computeWorldMatrix(true);
            this.setLocalAxes(this.meshPicked);
        }

        public redo()  {
            this.actHist.redo();
            this.meshPicked.computeWorldMatrix(true);
            this.setLocalAxes(this.meshPicked);
        }

        public detach()  {
            this.canvas.removeEventListener("pointerdown", this.pointerdown, false);
            this.canvas.removeEventListener("pointerup", this.pointerup, false);
            this.canvas.removeEventListener("pointermove", this.pointermove, false);
            this.scene.unregisterBeforeRender(this.renderer);
            this.disposeAll();
        }

        public disposeAll()  {
            this.theParent.dispose();
            this.disposeMaterials();
            this.actHist = null;
        }

        private pDown: boolean = false;

        private axisPicked: Mesh;

        private onPointerDown(evt: Event)  {
            evt.preventDefault();
            this.pDown = true;
            if(((<PointerEvent>evt).button != 0)) return;
            var pickResult: PickingInfo = this.scene.pick(this.scene.pointerX, this.scene.pointerY, (mesh) => {
                if((this.transEnabled)) {
                    if(((mesh == this.tX) || (mesh == this.tY) || (mesh == this.tZ))) return true;
                } else if((this.rotEnabled)) {
                    if(((mesh == this.rX) || (mesh == this.rY) || (mesh == this.rZ))) return true;
                } else if((this.scaleEnabled)) {
                    if(((mesh == this.sX) || (mesh == this.sY) || (mesh == this.sZ) || (mesh == this.sAll))) return true;
                }
                return false;
            }, null, this.mainCamera);
            if((pickResult.hit)) {
                this.setAxisVisiblity(0);
                this.axisPicked = <Mesh>pickResult.pickedMesh;
                (<Mesh>this.axisPicked.getChildren()[0]).visibility = 1;
                var name: string = this.axisPicked.name;
                if((name == "X")) this.bXaxis.visibility = 1; else if((name == "Y")) this.bYaxis.visibility = 1; else if((name == "Z")) this.bZaxis.visibility = 1; else if((name == "ALL")) {
                    this.bXaxis.visibility = 1;
                    this.bYaxis.visibility = 1;
                    this.bZaxis.visibility = 1;
                }
                this.editing = true;
                this.prevPos = this.getPosOnPickPlane();
                window.setTimeout(((cam,can) => { return this.detachControl(cam,can) }), 0, this.mainCamera, this.canvas);
            }
        }

        public isEditing() : boolean {
            return this.editing;
        }

        private detachControl(cam: Object, can: Object)  {
            var camera: Camera = <Camera>cam;
            var canvas: HTMLCanvasElement = <HTMLCanvasElement>can;
            camera.detachControl(canvas);
        }

        private prevOverMesh: Mesh;

        private onPointerOver()  {
            if((this.pDown)) return;
            var pickResult: PickingInfo = this.scene.pick(this.scene.pointerX, this.scene.pointerY, (mesh) => {
                if((this.transEnabled)) {
                    if(((mesh == this.tX) || (mesh == this.tY) || (mesh == this.tZ))) return true;
                } else if((this.rotEnabled)) {
                    if(((mesh == this.rX) || (mesh == this.rY) || (mesh == this.rZ))) return true;
                } else if((this.scaleEnabled)) {
                    if(((mesh == this.sX) || (mesh == this.sY) || (mesh == this.sZ) || (mesh == this.sAll))) return true;
                }
                return false;
            }, null, this.mainCamera);
            if((pickResult.hit)) {
                if((<Mesh>pickResult.pickedMesh != this.prevOverMesh)) {
                    if((this.prevOverMesh != null)) {
                        this.prevOverMesh.visibility = 0;
                        this.restoreColor(this.prevOverMesh);
                    }
                    this.prevOverMesh = <Mesh>pickResult.pickedMesh;
                    if((this.rotEnabled)) {
                        (<LinesMesh>this.prevOverMesh.getChildren()[0]).color = Color3.White();
                    } else {
                        (<Mesh>this.prevOverMesh.getChildren()[0]).material = this.whiteMat;
                    }
                    if((this.prevOverMesh.name == "X")) {
                        this.xaxis.color = Color3.White();
                    } else if((this.prevOverMesh.name == "Y")) {
                        this.yaxis.color = Color3.White();
                    } else if((this.prevOverMesh.name == "Z")) {
                        this.zaxis.color = Color3.White();
                    }
                }
            } else {
                if((this.prevOverMesh != null)) {
                    this.restoreColor(this.prevOverMesh);
                    this.prevOverMesh = null;
                }
            }
        }

        private restoreColor(mesh: Mesh)  {
            var col: Color3;
            var mat: Material;
            if((mesh.name == "X")) {
                col = Color3.Red();
                mat = this.redMat;
                this.xaxis.color = Color3.Red();
            } else if((this.prevOverMesh.name == "Y")) {
                col = Color3.Green();
                mat = this.greenMat;
                this.yaxis.color = Color3.Green();
            } else if((this.prevOverMesh.name == "Z")) {
                col = Color3.Blue();
                mat = this.blueMat;
                this.zaxis.color = Color3.Blue();
            } else {
                col = Color3.Yellow();
                mat = this.yellowMat;
            }
            if((this.rotEnabled)) {
                (<LinesMesh>this.prevOverMesh.getChildren()[0]).color = col;
            } else {
                (<Mesh>this.prevOverMesh.getChildren()[0]).material = mat;
            }
        }

        editing: boolean = false;

        private onPointerUp(evt: Event)  {
            this.pDown = false;
            if((this.editing)) {
                this.mainCamera.attachControl(this.canvas);
                this.editing = false;
                this.setAxisVisiblity(1);
                this.hideBaxis();
                this.restoreColor(this.prevOverMesh);
                this.prevOverMesh = null;
                this.actHist.add();
            }
        }

        private prevPos: Vector3;

        private snapX: number = 0;

        private snapY: number = 0;

        private snapZ: number = 0;

        private snapRX: number = 0;

        private snapRY: number = 0;

        private snapRZ: number = 0;

        private onPointerMove(evt: Event)  {
            if((!this.pDown || !this.editing)) return;
            var newPos: Vector3 = this.getPosOnPickPlane();
            if((newPos == null)) return;
            if((this.transEnabled)) this.doTranslation(newPos);
            if((this.scaleEnabled && this.local)) this.doScaling(newPos);
            if((this.rotEnabled)) this.doRotation(newPos);
            this.prevPos = newPos;
        }

        private doTranslation(newPos: Vector3)  {
            var diff: Vector3 = newPos.subtract(this.prevPos);
            var dl: number = diff.length();
            var space: Space = Space.WORLD;
            if((this.local)) space = Space.LOCAL;
            if((this.axisPicked == this.tX)) {
                if((this.local)) dl = Vector3.Dot(diff, this.localX) / (this.localX.length() * this.meshPicked.scaling.x); else dl = diff.x;
                if((this.snapT)) {
                    this.snapX+=dl;
                    dl = 0;
                    var scale: number = 1;
                    if((this.local)) scale = this.meshPicked.scaling.x;
                    if((Math.abs(this.snapX) > this.transSnap / scale)) {
                        if((this.snapX > 0)) dl = this.transSnap / scale; else dl = -this.transSnap / scale;
                        this.snapX = 0;
                    }
                }
                this.meshPicked.translate(Axis.X, dl, space);
            } else if((this.axisPicked == this.tY)) {
                if((this.local)) dl = Vector3.Dot(diff, this.localY) / (this.localY.length() * this.meshPicked.scaling.y); else dl = diff.y;
                if((this.snapT)) {
                    this.snapY+=dl;
                    dl = 0;
                    var scale: number = 1;
                    if((this.local)) scale = this.meshPicked.scaling.y;
                    if((Math.abs(this.snapY) > this.transSnap / scale)) {
                        if((this.snapY > 0)) dl = this.transSnap / scale; else dl = -this.transSnap / scale;
                        this.snapY = 0;
                    }
                }
                this.meshPicked.translate(Axis.Y, dl, space);
            } else if((this.axisPicked == this.tZ)) {
                if((this.local)) dl = Vector3.Dot(diff, this.localZ) / (this.localZ.length() * this.meshPicked.scaling.z); else dl = diff.z;
                if((this.snapT)) {
                    this.snapZ+=dl;
                    dl = 0;
                    var scale: number = 1;
                    if((this.local)) scale = this.meshPicked.scaling.z;
                    if((Math.abs(this.snapZ) > this.transSnap / scale)) {
                        if((this.snapZ > 0)) dl = this.transSnap / scale; else dl = -this.transSnap / scale;
                        this.snapZ = 0;
                    }
                }
                this.meshPicked.translate(Axis.Z, dl, space);
            }
        }

        private doScaling(newPos: Vector3)  {
            var ppm: Vector3 = this.prevPos.subtract(this.meshPicked.position);
            var diff: Vector3 = newPos.subtract(this.prevPos);
            var r: number = diff.length() / ppm.length();
            if((this.axisPicked == this.sX)) {
                var dot: number = Vector3.Dot(diff, this.localX);
                if((dot >= 0)) this.meshPicked.scaling.x*=(1 + r); else this.meshPicked.scaling.x*=(1 - r);
            } else if((this.axisPicked == this.sY)) {
                var dot: number = Vector3.Dot(diff, this.localY);
                if((dot >= 0)) this.meshPicked.scaling.y*=(1 + r); else this.meshPicked.scaling.y*=(1 - r);
            } else if((this.axisPicked == this.sZ)) {
                var dot: number = Vector3.Dot(diff, this.localZ);
                if((dot >= 0)) this.meshPicked.scaling.z*=(1 + r); else this.meshPicked.scaling.z*=(1 - r);
            } else if((this.axisPicked == this.sAll)) {
                var dot: number = Vector3.Dot(diff, this.mainCamera.upVector);
                r = diff.length() / 5;
                if((dot < 0)) {
                    r = -1 * r;
                }
                this.meshPicked.scaling.x*=(1 + r);
                this.meshPicked.scaling.y*=(1 + r);
                this.meshPicked.scaling.z*=(1 + r);
            }
        }

        private doRotation(newPos: Vector3)  {
            var cN: Vector3 = Vector3.TransformNormal(Axis.Z, this.mainCamera.getWorldMatrix());
            if((this.axisPicked == this.rX)) {
                var angle: number = EditControl.getAngle(this.prevPos, newPos, this.meshPicked.position, cN);
                if((this.snapR)) {
                    this.snapRX+=angle;
                    angle = 0;
                    if((Math.abs(this.snapRX) >= this.rotSnap)) {
                        if((this.snapRX > 0)) angle = this.rotSnap; else angle = -this.rotSnap;
                        this.snapRX = 0;
                    }
                }
                if((this.local)) {
                    if((Vector3.Dot(this.localX, cN) < 0)) angle = -1 * angle;
                    this.meshPicked.rotate(Axis.X, angle, Space.LOCAL);
                } else this.meshPicked.rotate(new Vector3(cN.x, 0, 0), angle, Space.WORLD);
                this.setLocalAxes(this.meshPicked);
            } else if((this.axisPicked == this.rY)) {
                var angle: number = EditControl.getAngle(this.prevPos, newPos, this.meshPicked.position, cN);
                if((this.snapR)) {
                    this.snapRY+=angle;
                    angle = 0;
                    if((Math.abs(this.snapRY) >= this.rotSnap)) {
                        if((this.snapRY > 0)) angle = this.rotSnap; else angle = -this.rotSnap;
                        this.snapRY = 0;
                    }
                }
                if((this.local)) {
                    if((Vector3.Dot(this.localY, cN) < 0)) angle = -1 * angle;
                    this.meshPicked.rotate(Axis.Y, angle, Space.LOCAL);
                } else this.meshPicked.rotate(new Vector3(0, cN.y, 0), angle, Space.WORLD);
                this.setLocalAxes(this.meshPicked);
            } else if((this.axisPicked == this.rZ)) {
                var angle: number = EditControl.getAngle(this.prevPos, newPos, this.meshPicked.position, cN);
                if((this.snapR)) {
                    this.snapRZ+=angle;
                    angle = 0;
                    if((Math.abs(this.snapRZ) >= this.rotSnap)) {
                        if((this.snapRZ > 0)) angle = this.rotSnap; else angle = -this.rotSnap;
                        this.snapRZ = 0;
                    }
                }
                if((this.local)) {
                    if((Vector3.Dot(this.localZ, cN) < 0)) angle = -1 * angle;
                    this.meshPicked.rotate(Axis.Z, angle, Space.LOCAL);
                } else this.meshPicked.rotate(new Vector3(0, 0, cN.z), angle, Space.WORLD);
                this.setLocalAxes(this.meshPicked);
            }
            this.meshPicked.rotation = this.meshPicked.rotationQuaternion.toEulerAngles();
        }

        private getPosOnPickPlane() : Vector3 {
            var pickinfo: PickingInfo = this.scene.pick(this.scene.pointerX, this.scene.pointerY, (mesh) => {
                return mesh == this.pickPlane;
            }, null, this.mainCamera);
            if((pickinfo.hit)) {
                return pickinfo.pickedPoint;
            } else {
                return null;
            }
        }

        private hideBaxis()  {
            this.bXaxis.visibility = 0;
            this.bYaxis.visibility = 0;
            this.bZaxis.visibility = 0;
        }

        private setAxisVisiblity(v: number)  {
            if((this.transEnabled)) {
                this.tEndX.visibility = v;
                this.tEndY.visibility = v;
                this.tEndZ.visibility = v;
            }
            if((this.rotEnabled)) {
                this.rEndX.visibility = v;
                this.rEndY.visibility = v;
                this.rEndZ.visibility = v;
            }
            if((this.scaleEnabled)) {
                this.sEndX.visibility = v;
                this.sEndY.visibility = v;
                this.sEndZ.visibility = v;
                this.sEndAll.visibility = v;
            }
        }

        private transEnabled: boolean = false;

        public isTranslationEnabled() : boolean {
            return this.transEnabled;
        }

        public enableTranslation()  {
            if((this.tX == null)) {
                this.createTransAxes();
                this.tCtl.parent = this.theParent;
            }
            if((!this.transEnabled)) {
                this.tEndX.visibility = 1;
                this.tEndY.visibility = 1;
                this.tEndZ.visibility = 1;
                this.transEnabled = true;
                this.disableRotation();
                this.disableScaling();
            }
        }

        public disableTranslation()  {
            if((this.transEnabled)) {
                this.tEndX.visibility = 0;
                this.tEndY.visibility = 0;
                this.tEndZ.visibility = 0;
                this.transEnabled = false;
            }
        }

        private rotEnabled: boolean = false;

        public isRotationEnabled() : boolean {
            return this.rotEnabled;
        }

        public enableRotation()  {
            if((this.rX == null)) {
                this.createRotAxes();
                this.rCtl.parent = this.theParent;
            }
            if((!this.rotEnabled)) {
                this.rEndX.visibility = 1;
                this.rEndY.visibility = 1;
                this.rEndZ.visibility = 1;
                this.rotEnabled = true;
                this.disableTranslation();
                this.disableScaling();
            }
        }

        public disableRotation()  {
            if((this.rotEnabled)) {
                this.rEndX.visibility = 0;
                this.rEndY.visibility = 0;
                this.rEndZ.visibility = 0;
                this.rotEnabled = false;
            }
        }

        private scaleEnabled: boolean = false;

        public isScaleEnabled() : boolean {
            return this.scaleEnabled;
        }

        public enableScaling()  {
            if((this.sX == null)) {
                this.createScaleAxes();
                this.sCtl.parent = this.theParent;
            }
            if((!this.scaleEnabled)) {
                this.sEndX.visibility = 1;
                this.sEndY.visibility = 1;
                this.sEndZ.visibility = 1;
                this.sEndAll.visibility = 1;
                this.scaleEnabled = true;
                this.disableTranslation();
                this.disableRotation();
            }
        }

        public disableScaling()  {
            if((this.scaleEnabled)) {
                this.sEndX.visibility = 0;
                this.sEndY.visibility = 0;
                this.sEndZ.visibility = 0;
                this.sEndAll.visibility = 0;
                this.scaleEnabled = false;
            }
        }

        private bXaxis: LinesMesh;

        private bYaxis: LinesMesh;

        private bZaxis: LinesMesh;

        private xaxis: LinesMesh;

        private yaxis: LinesMesh;

        private zaxis: LinesMesh;

        private guideCtl: Mesh;

        private createGuideAxes()  {
            var l: number = this.axesLen * this.axesScale;
            this.guideCtl = new Mesh("guideCtl", this.scene);
            this.bXaxis = Mesh.CreateLines("xAxis", [new Vector3(-100, 0, 0), new Vector3(100, 0, 0)], this.scene);
            this.bYaxis = Mesh.CreateLines("yAxis", [new Vector3(0, -100, 0), new Vector3(0, 100, 0)], this.scene);
            this.bZaxis = Mesh.CreateLines("zAxis", [new Vector3(0, 0, -100), new Vector3(0, 0, 100)], this.scene);
            this.bXaxis.parent = this.guideCtl;
            this.bYaxis.parent = this.guideCtl;
            this.bZaxis.parent = this.guideCtl;
            this.bXaxis.color = Color3.Red();
            this.bYaxis.color = Color3.Green();
            this.bZaxis.color = Color3.Blue();
            this.bXaxis.renderingGroupId = 1;
            this.bYaxis.renderingGroupId = 1;
            this.bZaxis.renderingGroupId = 1;
            this.hideBaxis();
            this.xaxis = Mesh.CreateLines("xAxis", [new Vector3(0, 0, 0), new Vector3(l, 0, 0)], this.scene);
            this.yaxis = Mesh.CreateLines("yAxis", [new Vector3(0, 0, 0), new Vector3(0, l, 0)], this.scene);
            this.zaxis = Mesh.CreateLines("zAxis", [new Vector3(0, 0, 0), new Vector3(0, 0, l)], this.scene);
            this.xaxis.parent = this.guideCtl;
            this.yaxis.parent = this.guideCtl;
            this.zaxis.parent = this.guideCtl;
            this.xaxis.color = Color3.Red();
            this.yaxis.color = Color3.Green();
            this.zaxis.color = Color3.Blue();
            this.xaxis.renderingGroupId = 2;
            this.yaxis.renderingGroupId = 2;
            this.zaxis.renderingGroupId = 2;
        }

        private pickPlane: Mesh;

        private createPickPlane()  {
            this.pickPlane = Mesh.CreatePlane("axisPlane", 200, this.scene);
            this.pickPlane.isPickable = false;
            this.pickPlane.visibility = 0;
            this.pickPlane.billboardMode = Mesh.BILLBOARDMODE_ALL;
            this.pickPlane.renderingGroupId = 1;
        }

        private tCtl: Mesh;

        private tX: Mesh;

        private tY: Mesh;

        private tZ: Mesh;

        private tEndX: Mesh;

        private tEndY: Mesh;

        private tEndZ: Mesh;

        private createTransAxes()  {
            var r: number = 0.04;
            var l: number = this.axesLen * this.axesScale;
            this.tCtl = new Mesh("tarnsCtl", this.scene);
            this.tX = this.extrudeBox(r / 2, l);
            this.tX.name = "X";
            this.tY = this.tX.clone("Y");
            this.tZ = this.tX.clone("Z");
            this.tX.material = this.redMat;
            this.tY.material = this.greenMat;
            this.tZ.material = this.blueMat;
            this.tX.parent = this.tCtl;
            this.tY.parent = this.tCtl;
            this.tZ.parent = this.tCtl;
            this.tX.rotation.y = 1.57;
            this.tY.rotation.x-=1.57;
            this.tX.visibility = 0;
            this.tY.visibility = 0;
            this.tZ.visibility = 0;
            this.tX.renderingGroupId = 1;
            this.tY.renderingGroupId = 1;
            this.tZ.renderingGroupId = 1;
            this.tX.isPickable = false;
            this.tY.isPickable = false;
            this.tZ.isPickable = false;
            var cl: number = l * this.axesScale / 4;
            var cr: number = r * this.axesScale;
            this.tEndX = Mesh.CreateCylinder("tEndX", cl, 0, cr, 6, 1, this.scene);
            this.tEndY = this.tEndX.clone("tEndY");
            this.tEndZ = this.tEndX.clone("tEndZ");
            this.tEndX.rotation.x = 1.57;
            this.tEndY.rotation.x = 1.57;
            this.tEndZ.rotation.x = 1.57;
            this.tEndX.parent = this.tX;
            this.tEndY.parent = this.tY;
            this.tEndZ.parent = this.tZ;
            this.tEndX.position.z = l - cl / 2;
            this.tEndY.position.z = l - cl / 2;
            this.tEndZ.position.z = l - cl / 2;
            this.tEndX.material = this.redMat;
            this.tEndY.material = this.greenMat;
            this.tEndZ.material = this.blueMat;
            this.tEndX.renderingGroupId = 1;
            this.tEndY.renderingGroupId = 1;
            this.tEndZ.renderingGroupId = 1;
            this.tEndX.isPickable = false;
            this.tEndY.isPickable = false;
            this.tEndZ.isPickable = false;
        }

        private rCtl: Mesh;

        private rX: Mesh;

        private rY: Mesh;

        private rZ: Mesh;

        private rEndX: LinesMesh;

        private rEndY: LinesMesh;

        private rEndZ: LinesMesh;

        private createRotAxes()  {
            var r: number = 0.04;
            var d: number = this.axesLen * this.axesScale * 2;
            this.rCtl = new Mesh("rotCtl", this.scene);
            this.rX = Mesh.CreateTorus("X", d, r, 30, this.scene);
            this.rY = this.rX.clone("Y");
            this.rZ = this.rX.clone("Z");
            this.rX.material = this.redMat;
            this.rY.material = this.greenMat;
            this.rZ.material = this.blueMat;
            this.rX.parent = this.rCtl;
            this.rY.parent = this.rCtl;
            this.rZ.parent = this.rCtl;
            this.rX.rotation.z-=1.57;
            this.rZ.rotation.x = 1.57;
            this.rX.visibility = 0;
            this.rY.visibility = 0;
            this.rZ.visibility = 0;
            this.rX.renderingGroupId = 1;
            this.rY.renderingGroupId = 1;
            this.rZ.renderingGroupId = 1;
            this.rX.isPickable = false;
            this.rY.isPickable = false;
            this.rZ.isPickable = false;
            var cl: number = d;
            this.rEndX = this.createCircle(cl / 2);
            this.rEndY = this.rEndX.clone("");
            this.rEndZ = this.rEndX.clone("");
            this.rEndX.parent = this.rX;
            this.rEndY.parent = this.rY;
            this.rEndZ.parent = this.rZ;
            this.rEndX.rotation.x = 1.57;
            this.rEndY.rotation.x = 1.57;
            this.rEndZ.rotation.x = 1.57;
            this.rEndX.color = Color3.Red();
            this.rEndY.color = Color3.Green();
            this.rEndZ.color = Color3.Blue();
            this.rEndX.renderingGroupId = 1;
            this.rEndY.renderingGroupId = 1;
            this.rEndZ.renderingGroupId = 1;
            this.rEndX.isPickable = false;
            this.rEndY.isPickable = false;
            this.rEndZ.isPickable = false;
        }

        private extrudeBox(w: number, l: number) : Mesh {
            var shape: Vector3[] = [new Vector3(w, w, 0), new Vector3(-w, w, 0), new Vector3(-w, -w, 0), new Vector3(w, -w, 0), new Vector3(w, w, 0)];
            var path: Vector3[] = [new Vector3(0, 0, 0), new Vector3(0, 0, l)];
            var box: Mesh = Mesh.ExtrudeShape("", shape, path, 1, 0, 2, this.scene);
            return box;
        }

        private createCircle(r: number) : LinesMesh {
            var points: Vector3[] = [];
            var x: number;
            var y: number;
            var a: number = 3.14 / 180;
            var p: number = 0;
            for(var i: number = 0; i <= 360; i = i + 10) {
                x = r * Math.cos(i * a);
                if((i == 90)) y = r; else if((i == 270)) y = -r; else y = r * Math.sin(i * a);
                points[p] = new Vector3(x, y, 0);
                p++;
            }
            var circle: LinesMesh = Mesh.CreateLines("", points, this.scene);
            return circle;
        }

        private sCtl: Mesh;

        private sX: Mesh;

        private sY: Mesh;

        private sZ: Mesh;

        private sAll: Mesh;

        private sEndX: Mesh;

        private sEndY: Mesh;

        private sEndZ: Mesh;

        private sEndAll: Mesh;

        private createScaleAxes()  {
            var r: number = 0.04;
            var l: number = this.axesLen * this.axesScale;
            this.sCtl = new Mesh("sCtl", this.scene);
            this.sAll = Mesh.CreateBox("ALL", r * 2, this.scene);
            this.sX = this.extrudeBox(r / 2, l);
            this.sX.name = "X";
            this.sY = this.sX.clone("Y");
            this.sZ = this.sX.clone("Z");
            this.sX.material = this.redMat;
            this.sY.material = this.greenMat;
            this.sZ.material = this.blueMat;
            this.sAll.material = this.yellowMat;
            this.sX.parent = this.sCtl;
            this.sY.parent = this.sCtl;
            this.sZ.parent = this.sCtl;
            this.sAll.parent = this.sCtl;
            this.sX.rotation.y = 1.57;
            this.sY.rotation.x-=1.57;
            this.sX.visibility = 0;
            this.sY.visibility = 0;
            this.sZ.visibility = 0;
            this.sAll.visibility = 0;
            this.sX.renderingGroupId = 1;
            this.sY.renderingGroupId = 1;
            this.sZ.renderingGroupId = 1;
            this.sAll.renderingGroupId = 1;
            this.sX.isPickable = false;
            this.sY.isPickable = false;
            this.sZ.isPickable = false;
            this.sAll.isPickable = false;
            var cr: number = r * this.axesScale;
            this.sEndX = Mesh.CreateBox("", cr, this.scene);
            this.sEndY = this.sEndX.clone("");
            this.sEndZ = this.sEndX.clone("");
            this.sEndAll = this.sEndX.clone("");
            this.sEndX.parent = this.sX;
            this.sEndY.parent = this.sY;
            this.sEndZ.parent = this.sZ;
            this.sEndAll.parent = this.sAll;
            this.sEndX.position.z = l - cr / 2;
            this.sEndY.position.z = l - cr / 2;
            this.sEndZ.position.z = l - cr / 2;
            this.sEndX.material = this.redMat;
            this.sEndY.material = this.greenMat;
            this.sEndZ.material = this.blueMat;
            this.sEndAll.material = this.yellowMat;
            this.sEndX.renderingGroupId = 1;
            this.sEndY.renderingGroupId = 1;
            this.sEndZ.renderingGroupId = 1;
            this.sEndAll.renderingGroupId = 1;
            this.sEndX.isPickable = false;
            this.sEndY.isPickable = false;
            this.sEndZ.isPickable = false;
            this.sEndAll.isPickable = false;
        }

        private localX: Vector3;

        private localY: Vector3;

        private localZ: Vector3;

        private localRot: Vector3;

        private setLocalAxes(mesh: Mesh)  {
            var meshMatrix: Matrix = mesh.getWorldMatrix();
            var pos: Vector3 = mesh.position;
            this.localX = Vector3.TransformCoordinates(Axis.X, meshMatrix).subtract(pos);
            this.localY = Vector3.TransformCoordinates(Axis.Y, meshMatrix).subtract(pos);
            this.localZ = Vector3.TransformCoordinates(Axis.Z, meshMatrix).subtract(pos);
            this.localRot = Vector3.RotationFromAxis(this.localX, this.localY, this.localZ);
            if((this.local)) this.theParent.rotation.copyFrom(this.localRot);
        }

        public setLocal(l: boolean)  {
            if((this.local == l)) return;
            this.local = l;
            if((this.local)) this.theParent.rotation.copyFrom(this.localRot); else this.theParent.rotation.copyFrom(Vector3.Zero());
        }

        public isLocal() : boolean {
            return this.local;
        }

        public setTransSnap(s: boolean)  {
            this.snapT = s;
        }

        public setRotSnap(s: boolean)  {
            this.snapR = s;
        }

        public setTransSnapValue(t: number)  {
            this.transSnap = t;
        }

        public setRotSnapValue(r: number)  {
            this.rotSnap = r;
        }

        private setAxesScale()  {
            var distFromCamera: number = 2;
            var toParent: Vector3 = this.theParent.position.subtract(this.mainCamera.position);
            var cameraNormal: Vector3 = Vector3.TransformNormal(Axis.Z, this.mainCamera.getWorldMatrix());
            var parentOnNormal: number = Vector3.Dot(toParent, cameraNormal) / cameraNormal.length();
            var s: number = parentOnNormal / distFromCamera;
            var scale: Vector3 = new Vector3(s, s, s);
            this.theParent.scaling = scale;
        }

        public static getAngle(p1: Vector3, p2: Vector3, p: Vector3, cN: Vector3) : number {
            var v1: Vector3 = p1.subtract(p);
            var v2: Vector3 = p2.subtract(p);
            var n: Vector3 = Vector3.Cross(v1, v2);
            var angle: number = Math.asin(n.length() / (v1.length() * v2.length()));
            if((Vector3.Dot(n, cN) < 0)) {
                angle = -1 * angle;
            }
            return angle;
        }

        private createMaterials(scene: Scene)  {
            this.redMat = EditControl.getStandardMaterial("redMat", Color3.Red(), scene);
            this.greenMat = EditControl.getStandardMaterial("greenMat", Color3.Green(), scene);
            this.blueMat = EditControl.getStandardMaterial("blueMat", Color3.Blue(), scene);
            this.whiteMat = EditControl.getStandardMaterial("whiteMat", Color3.White(), scene);
            this.yellowMat = EditControl.getStandardMaterial("whiteMat", Color3.Yellow(), scene);
        }

        private disposeMaterials()  {
            this.redMat.dispose();
            this.greenMat.dispose();
            this.blueMat.dispose();
            this.whiteMat.dispose();
            this.yellowMat.dispose();
        }

        private static getStandardMaterial(name: string, col: Color3, scene: Scene) : StandardMaterial {
            var mat: StandardMaterial = new StandardMaterial(name, scene);
            mat.emissiveColor = col;
            mat.diffuseColor = Color3.Black();
            mat.specularColor = Color3.Black();
            return mat;
        }
    }

    export class ActHist {
        private mesh: AbstractMesh;

        private lastMax: number = 10;

        private acts: Array<Act> = new Array<Act>();

        private last: number = -1;

        private current: number = -1;

        public constructor(mesh: AbstractMesh, capacity: number)  {
            this.mesh = mesh;
            this.lastMax = capacity - 1;
            if((mesh.rotationQuaternion == null)) {
                if((mesh.rotation != null)) {
                    mesh.rotationQuaternion = Quaternion.RotationYawPitchRoll(mesh.rotation.y, mesh.rotation.x, mesh.rotation.z);
                }
            }
            this.add();
        }

        public setCapacity(c: number)  {
            if((c == 0)) {
                console.error("capacity should be more than zero");
                return;
            }
            this.lastMax = c - 1;
            this.last = -1;
            this.current = -1;
            this.acts = new Array<Act>();
            this.add();
        }

        public add()  {
            var act: Act = new Act(this.mesh);
            if((this.current < this.last)) {
                this.acts.splice(this.current + 1);
                this.last = this.current;
            }
            if((this.last == this.lastMax)) {
                this.acts.shift();
                this.acts.push(act);
            } else {
                this.acts.push(act);
                this.last++;
                this.current++;
            }
        }

        public undo()  {
            if((this.current > 0)) {
                this.current--;
                (<Act>this.acts[this.current]).perform(this.mesh);
            }
        }

        public redo()  {
            if((this.current < this.last)) {
                this.current++;
                (<Act>this.acts[this.current]).perform(this.mesh);
            }
        }
    }

    export class Act {
        private p: Vector3;

        private r: Quaternion;

        private s: Vector3;

        public constructor(mesh: AbstractMesh)  {
            this.p = mesh.position.clone();
            this.r = mesh.rotationQuaternion.clone();
            this.s = mesh.scaling.clone();
        }

        public perform(mesh: AbstractMesh)  {
            mesh.position = this.p.clone();
            mesh.rotationQuaternion = this.r.clone();
            mesh.scaling = this.s.clone();
        }
    }
}
