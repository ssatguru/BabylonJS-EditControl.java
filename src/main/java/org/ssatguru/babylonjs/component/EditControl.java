package org.ssatguru.babylonjs.component;

import static jsweet.dom.Globals.console;
import static jsweet.dom.Globals.window;
import static jsweet.util.Globals.function;

import def.babylonjs.babylon.Axis;
import def.babylonjs.babylon.Camera;
import def.babylonjs.babylon.Color3;
import def.babylonjs.babylon.LinesMesh;
import def.babylonjs.babylon.Matrix;
import def.babylonjs.babylon.Mesh;
import def.babylonjs.babylon.PickingInfo;
import def.babylonjs.babylon.Scene;
import def.babylonjs.babylon.Space;
import def.babylonjs.babylon.StandardMaterial;
import def.babylonjs.babylon.Vector3;
import jsweet.dom.Event;
import jsweet.dom.HTMLCanvasElement;
import jsweet.dom.PointerEvent;
import jsweet.lang.Math;

public class EditControl {

	private Mesh meshPicked;
	HTMLCanvasElement canvas;
	private Scene scene;
	private Camera mainCamera;
	private Mesh theParent;
	private boolean local = true;
	private boolean snapT = false;
	private boolean snapR = false;
	private double transSnap = 1;
	private double rotSnap = Math.PI / 18;// 10 degree
	private double axesLen = 0.4;
	private double axesScale = 1;
	private StandardMaterial redMat, greenMat, blueMat, whiteMat;

	public EditControl(Mesh mesh, Camera camera,  HTMLCanvasElement canvas, double scale) {
		this.meshPicked = mesh;
		this.canvas = canvas;
		this.axesScale = scale;
		
		this.scene = mesh.getScene();
		//this.mainCamera = scene.activeCamera;
		this.mainCamera = camera;

		theParent = new Mesh("EditControl", this.scene);
		theParent.position = this.meshPicked.position;
		theParent.visibility = 0;
		theParent.isPickable = false;

		createMaterials(this.scene);
		createGuideAxes();
		this.guideCtl.parent = this.theParent;
		createPickPlane();
		this.pickPlane.parent = this.theParent;

		canvas.addEventListener("pointerdown", this::onPointerDown, false);
		canvas.addEventListener("pointerup", this::onPointerUp, false);
		canvas.addEventListener("pointermove", this::onPointerMove, false);
		setLocalAxes(mesh);

		this.scene.registerBeforeRender(this::renderLoopProcess);
	}

	private void renderLoopProcess() {
		setAxesScale();
		this.theParent.position = this.meshPicked.position;
		onPointerOver();
	}

	public void switchTo(Mesh mesh) {
		this.meshPicked = mesh;
		this.setLocalAxes(mesh);
	}

	public void detach() {
		this.theParent.dispose();
		this.disposeMaterials();
		this.canvas.removeEventListener("pointerdown", this::onPointerDown, false);
		this.canvas.removeEventListener("pointerup", this::onPointerUp, false);
		this.canvas.removeEventListener("pointermove", this::onPointerMove, false);
		this.scene.unregisterBeforeRender(this::renderLoopProcess);
	}

	boolean pDown = false;

	Mesh axisPicked;

	private void onPointerDown(Event evt) {
		evt.preventDefault();
		this.pDown = true;

		if (((PointerEvent) evt).button != 0)
			return;

		// see if any of the axes clicked
		PickingInfo pickResult = this.scene.pick(this.scene.pointerX, this.scene.pointerY, (mesh) -> {
			if (this.transEnabled) {
				if ((mesh == this.tX) || (mesh == this.tY) || (mesh == this.tZ))
					return true;
			} else if (this.rotEnabled) {
				if ((mesh == this.rX) || (mesh == this.rY) || (mesh == this.rZ))
					return true;
			} else if (this.scaleEnabled) {
				if ((mesh == this.sX) || (mesh == this.sY) || (mesh == this.sZ) || (mesh == this.sAll))
					return true;
			}
			return false;
		},null,this.mainCamera);
		if (pickResult.hit) {
			setAxisVisiblity(0);
			this.axisPicked = (Mesh) pickResult.pickedMesh;
			((Mesh) this.axisPicked.getChildren()[0]).visibility = 1;
			this.editing = true;
			this.pickPlane.isPickable = true;
			this.prevPos = getPosOnPickPlane();
			//this.mainCamera.detachControl(this.canvas);
			window.setTimeout(function(this::detachControl), 0, this.mainCamera,this.canvas);
		}

	}
	
	 private void detachControl(Object cam, Object can){
          Camera camera = (Camera) cam;
         HTMLCanvasElement canvas = (HTMLCanvasElement) can;
         camera.detachControl(canvas);
  }

	private Mesh prevOverMesh;

	private void onPointerOver() {
		if (this.pDown)
			return;

		// see if we are over any of the axes
		PickingInfo pickResult = this.scene.pick(this.scene.pointerX, this.scene.pointerY, (mesh) -> {
			if (this.transEnabled) {
				if ((mesh == this.tX) || (mesh == this.tY) || (mesh == this.tZ))
					return true;
			} else if (this.rotEnabled) {
				if ((mesh == this.rX) || (mesh == this.rY) || (mesh == this.rZ))
					return true;
			} else if (this.scaleEnabled) {
				if ((mesh == this.sX) || (mesh == this.sY) || (mesh == this.sZ) || (mesh == this.sAll))
					return true;
			}
			return false;
		},null,this.mainCamera);
		if (pickResult.hit) {
			if ((Mesh) pickResult.pickedMesh != this.prevOverMesh) {
				this.prevOverMesh = (Mesh) pickResult.pickedMesh;
				setAxisVisiblity(0);
				((Mesh) this.prevOverMesh.getChildren()[0]).visibility = 1;
			}
		} else {
			if (this.prevOverMesh != null) {
				setAxisVisiblity(1);
				this.prevOverMesh = null;
			}
		}

	}

	boolean editing = false;

	private void onPointerUp(Event evt) {
		this.pDown = false;
		if (editing) {
			this.mainCamera.attachControl(this.canvas);
			editing = false;
			this.pickPlane.isPickable = false;
			setAxisVisiblity(1);
			this.prevOverMesh = null;
		}
	}

	Vector3 prevPos;

	double snapX = 0, snapY = 0, snapZ = 0;
	double snapRX = 0, snapRY = 0, snapRZ = 0;

	private void onPointerMove(Event evt) {

		if (!this.pDown || !editing)
			return;

		Vector3 newPos = getPosOnPickPlane();

		if (newPos == null)
			return;

		if (this.transEnabled)
			doTranslation(newPos);

		// no scaling in global mode
		if (this.scaleEnabled && local)
			doScaling(newPos);

		if (this.rotEnabled)
			doRotation(newPos);
		prevPos = newPos;

	}

	private void doTranslation(Vector3 newPos) {

		Vector3 diff = newPos.subtract(prevPos);
		double dl = diff.length();
		Space space = Space.WORLD;
		if (local)
			space = Space.LOCAL;
		// in local take care of scaling - meshes uploaded may have
		// scale other than 1.
		if (this.axisPicked == this.tX) {
			if (local)
				dl = Vector3.Dot(diff, localX) / (localX.length() * this.meshPicked.scaling.x);
			else
				dl = diff.x;
			if (snapT) {
				snapX += dl;
				dl = 0;
				double scale = 1;
				if (local)
					scale = this.meshPicked.scaling.x;
				if (Math.abs(snapX) > this.transSnap / scale) {
					if (snapX > 0)
						dl = this.transSnap / scale;
					else
						dl = -this.transSnap / scale;
					snapX = 0;
				}
			}
			this.meshPicked.translate(Axis.X, dl, space);
		} else if (this.axisPicked == this.tY) {
			if (local)
				dl = Vector3.Dot(diff, localY) / (localY.length() * this.meshPicked.scaling.y);
			else
				dl = diff.y;
			if (snapT) {
				snapY += dl;
				dl = 0;
				double scale = 1;
				if (local)
					scale = this.meshPicked.scaling.y;
				if (Math.abs(snapY) > this.transSnap / scale) {
					if (snapY > 0)
						dl = this.transSnap / scale;
					else
						dl = -this.transSnap / scale;
					snapY = 0;
				}
			}
			this.meshPicked.translate(Axis.Y, dl, space);
		} else if (this.axisPicked == this.tZ) {
			if (local)
				dl = Vector3.Dot(diff, localZ) / (localZ.length() * this.meshPicked.scaling.z);
			else
				dl = diff.z;
			if (snapT) {
				snapZ += dl;
				dl = 0;
				double scale = 1;
				if (local)
					scale = this.meshPicked.scaling.z;
				if (Math.abs(snapZ) > this.transSnap / scale) {
					if (snapZ > 0)
						dl = this.transSnap / scale;
					else
						dl = -this.transSnap / scale;
					snapZ = 0;
				}
			}
			this.meshPicked.translate(Axis.Z, dl, space);
		}

	}

	private void doScaling(Vector3 newPos) {

		Vector3 ppm = this.prevPos.subtract(this.meshPicked.position);
		Vector3 npm = newPos.subtract(this.meshPicked.position);
		Vector3 diff = newPos.subtract(prevPos);
		double r = diff.length() / ppm.length();
		//double r = diff.length() / 10;
		if (this.axisPicked == this.sX) {
			double dot = Vector3.Dot(diff, localX);
			if (dot >= 0)
				this.meshPicked.scaling.x *= (1 + r);
			else
				this.meshPicked.scaling.x *= (1 - r);
		} else if (this.axisPicked == this.sY) {
			double dot = Vector3.Dot(diff, localY);
			if (dot >= 0)
				this.meshPicked.scaling.y *= (1 + r);
			else
				this.meshPicked.scaling.y *= (1 - r);
		} else if (this.axisPicked == this.sZ) {
			double dot = Vector3.Dot(diff, localZ);
			if (dot >= 0)
				this.meshPicked.scaling.z *= (1 + r);
			else
				this.meshPicked.scaling.z *= (1 - r);
		} else if (this.axisPicked == this.sAll) {
			double dot = Vector3.Dot(diff, this.mainCamera.upVector);
			r = diff.length() / 5;
			if (dot < 0) {
				r = -1 * r;
			}
			this.meshPicked.scaling.x *= (1 + r);
			this.meshPicked.scaling.y *= (1 + r);
			this.meshPicked.scaling.z *= (1 + r);

		}

	}

	private void doRotation(Vector3 newPos) {

		Vector3 cN = Vector3.TransformNormal(Axis.Z, this.mainCamera.getWorldMatrix());
		if (this.axisPicked == this.rX) {
			double angle = getAngle(prevPos, newPos, this.meshPicked.position, cN);
			if (snapR) {
				snapRX += angle;
				angle = 0;
				if (Math.abs(snapRX) >= this.rotSnap) {
					if (snapRX > 0)
						angle = this.rotSnap;
					else
						angle = -this.rotSnap;
					snapRX = 0;
				}
			}
			if (this.local) {
				if (Vector3.Dot(this.localX, cN) < 0)
					angle = -1 * angle;
				this.meshPicked.rotate(Axis.X, angle, Space.LOCAL);
			} else
				this.meshPicked.rotate(new Vector3(cN.x, 0, 0), angle, Space.WORLD);
			setLocalAxes(this.meshPicked);
		} else if (this.axisPicked == this.rY) {
			double angle = getAngle(prevPos, newPos, this.meshPicked.position, cN);
			if (snapR) {
				snapRY += angle;
				angle = 0;
				if (Math.abs(snapRY) >= this.rotSnap) {
					if (snapRY > 0)
						angle = this.rotSnap;
					else
						angle = -this.rotSnap;
					snapRY = 0;
				}
			}
			if (this.local) {
				if (Vector3.Dot(this.localY, cN) < 0)
					angle = -1 * angle;
				this.meshPicked.rotate(Axis.Y, angle, Space.LOCAL);
			} else
				this.meshPicked.rotate(new Vector3(0, cN.y, 0), angle, Space.WORLD);
			setLocalAxes(this.meshPicked);
		} else if (this.axisPicked == this.rZ) {
			double angle = getAngle(prevPos, newPos, this.meshPicked.position, cN);
			if (snapR) {
				snapRZ += angle;
				angle = 0;
				if (Math.abs(snapRZ) >= this.rotSnap) {
					if (snapRZ > 0)
						angle = this.rotSnap;
					else
						angle = -this.rotSnap;
					snapRZ = 0;
				}
			}
			if (this.local) {
				if (Vector3.Dot(this.localZ, cN) < 0)
					angle = -1 * angle;
				this.meshPicked.rotate(Axis.Z, angle, Space.LOCAL);
			} else
				this.meshPicked.rotate(new Vector3(0, 0, cN.z), angle, Space.WORLD);
			setLocalAxes(this.meshPicked);
		}

	}

	private Vector3 getPosOnPickPlane() {
		PickingInfo pickinfo = scene.pick(scene.pointerX, scene.pointerY, (mesh) -> {
			return mesh == this.pickPlane;
		},null,this.mainCamera);
		
		if (pickinfo.hit) {
			return pickinfo.pickedPoint;
		} else {
			return null;
		}

	}

	private void setAxisVisiblity(double v) {
		if (transEnabled) {
			this.tEndX.visibility = v;
			this.tEndY.visibility = v;
			this.tEndZ.visibility = v;
		}
		if (rotEnabled) {
			this.rEndX.visibility = v;
			this.rEndY.visibility = v;
			this.rEndZ.visibility = v;
		}
		if (scaleEnabled) {
			this.sEndX.visibility = v;
			this.sEndY.visibility = v;
			this.sEndZ.visibility = v;
			this.sEndAll.visibility = v;
		}

	}

	private boolean transEnabled = false;

	public void enableTranslation() {
		if (this.tX == null) {
			createTransAxes();
			this.tCtl.parent = this.theParent;
		}
		if (!transEnabled) {
			this.tEndX.visibility = 1;
			this.tEndY.visibility = 1;
			this.tEndZ.visibility = 1;
			this.transEnabled = true;
			disableRotation();
			disableScaling();

		}
	}

	public void disableTranslation() {
		if (transEnabled) {
			this.tEndX.visibility = 0;
			this.tEndY.visibility = 0;
			this.tEndZ.visibility = 0;
			transEnabled = false;
		}

	}

	private boolean rotEnabled = false;

	public void enableRotation() {
		if (rX == null) {
			createRotAxes();
			this.rCtl.parent = this.theParent;
		}
		if (!rotEnabled) {

			this.rEndX.visibility = 1;
			this.rEndY.visibility = 1;
			this.rEndZ.visibility = 1;
			rotEnabled = true;
			disableTranslation();
			disableScaling();
		}

	}

	public void disableRotation() {
		if (rotEnabled) {
			this.rEndX.visibility = 0;
			this.rEndY.visibility = 0;
			this.rEndZ.visibility = 0;
			rotEnabled = false;
		}
	}

	private boolean scaleEnabled = false;

	public void enableScaling() {

		if (this.sX == null) {
			createScaleAxes();
			this.sCtl.parent = this.theParent;
		}

		if (!scaleEnabled) {
			this.sEndX.visibility = 1;
			this.sEndY.visibility = 1;
			this.sEndZ.visibility = 1;
			this.sEndAll.visibility = 1;
			scaleEnabled = true;
			disableTranslation();
			disableRotation();
		}
	}

	public void disableScaling() {
		if (scaleEnabled) {
			this.sEndX.visibility = 0;
			this.sEndY.visibility = 0;
			this.sEndZ.visibility = 0;
			this.sEndAll.visibility = 0;
			scaleEnabled = false;
		}
	}

	private LinesMesh xaxis, yaxis, zaxis;
	private Mesh guideCtl;

	private void createGuideAxes() {
		double l = this.axesLen * this.axesScale;

		guideCtl = new Mesh("guideCtl", this.scene);

		xaxis = Mesh.CreateLines("xAxis", new Vector3[] { new Vector3(0, 0, 0), new Vector3(l, 0, 0) }, scene);
		yaxis = Mesh.CreateLines("yAxis", new Vector3[] { new Vector3(0, 0, 0), new Vector3(0, l, 0) }, scene);
		zaxis = Mesh.CreateLines("zAxis", new Vector3[] { new Vector3(0, 0, 0), new Vector3(0, 0, l) }, scene);
		this.xaxis.parent = this.guideCtl;
		this.yaxis.parent = this.guideCtl;
		this.zaxis.parent = this.guideCtl;

		xaxis.color = Color3.Red();
		yaxis.color = Color3.Green();
		zaxis.color = Color3.Blue();

		xaxis.renderingGroupId = 1;
		yaxis.renderingGroupId = 1;
		zaxis.renderingGroupId = 1;

	}

	private Mesh pickPlane;

	private void createPickPlane() {
		this.pickPlane = Mesh.CreatePlane("axisPlane", 20, this.scene);
		this.pickPlane.isPickable = false;
		this.pickPlane.visibility = 0;
		this.pickPlane.billboardMode = Mesh.BILLBOARDMODE_ALL;
		this.pickPlane.renderingGroupId = 1;

	}

	private Mesh tCtl, tX, tY, tZ, tEndX, tEndY, tEndZ;

	private void createTransAxes() {
		
		double r = 0.04;
		double l = this.axesLen * this.axesScale;
	
		tCtl = new Mesh("tarnsCtl", this.scene);

		this.tX = extrudeBox(r / 2, l);
		this.tX.name = "transX";
		this.tY = this.tX.clone("transY");
		this.tZ = this.tX.clone("transZ");

		this.tX.parent = this.tCtl;
		this.tY.parent = this.tCtl;
		this.tZ.parent = this.tCtl;

		this.tX.rotation.y = 1.57;
		this.tY.rotation.x -= 1.57;

		this.tX.visibility = 0;
		this.tY.visibility = 0;
		this.tZ.visibility = 0;

		this.tX.renderingGroupId = 1;
		this.tY.renderingGroupId = 1;
		this.tZ.renderingGroupId = 1;

		double cl = l * this.axesScale / 4, cr = r * this.axesScale;
		tEndX = Mesh.CreateCylinder("tEndX", cl, 0, cr, 6, 1, this.scene);
		tEndY = tEndX.clone("tEndY");
		tEndZ = tEndX.clone("tEndZ");

		tEndX.rotation.x = 1.57;
		tEndY.rotation.x = 1.57;
		tEndZ.rotation.x = 1.57;

		tEndX.parent = this.tX;
		tEndY.parent = this.tY;
		tEndZ.parent = this.tZ;

		tEndX.position.z = l - cl / 2;
		tEndY.position.z = l - cl / 2;
		tEndZ.position.z = l - cl / 2;

		tEndX.material = redMat;
		tEndY.material = greenMat;
		tEndZ.material = blueMat;

		tEndX.renderingGroupId = 1;
		tEndY.renderingGroupId = 1;
		tEndZ.renderingGroupId = 1;

	}


	Mesh rCtl, rX, rY, rZ ;
	LinesMesh rEndX, rEndY, rEndZ;
	
	private void createRotAxes() {
		double r = 0.04;
		double d = this.axesLen * this.axesScale * 2;
		this.rCtl = new Mesh("rotCtl", this.scene);

		this.rX = Mesh.CreateTorus("", d, r, 20, this.scene);
		this.rY = rX.clone("");
		this.rZ = rX.clone("");

		this.rX.parent = this.rCtl;
		this.rY.parent = this.rCtl;
		this.rZ.parent = this.rCtl;

		this.rX.rotation.z -= 1.57;
		this.rZ.rotation.x = 1.57;

		this.rX.visibility = 0;
		this.rY.visibility = 0;
		this.rZ.visibility = 0;

		this.rX.renderingGroupId = 1;
		this.rY.renderingGroupId = 1;
		this.rZ.renderingGroupId = 1;

		double cl = d, cr = r / 8;

		
		rEndX = createCircle(cl/2);
		rEndY= rEndX.clone("");
		rEndZ= rEndX.clone("");

		rEndX.parent = this.rX;
		rEndY.parent = this.rY;
		rEndZ.parent = this.rZ;
		
		rEndX.rotation.x=1.57;
		rEndY.rotation.x=1.57;
		rEndZ.rotation.x=1.57;

		
		rEndX.color = Color3.Red();
		rEndY.color = Color3.Green();
		rEndZ.color = Color3.Blue();

		rEndX.renderingGroupId = 1;
		rEndY.renderingGroupId = 1;
		rEndZ.renderingGroupId = 1;

	}

	private Mesh extrudeBox(double w, double l) {
		Vector3[] shape = new Vector3[] { new Vector3(w, w, 0), new Vector3(-w, w, 0), new Vector3(-w, -w, 0),
				new Vector3(w, -w, 0), new Vector3(w, w, 0) };
		Vector3[] path = new Vector3[] { new Vector3(0, 0, 0), new Vector3(0, 0, l) };
		Mesh box = Mesh.ExtrudeShape("", shape, path, 1, 0, 0, this.scene);
		return box;
	}

	private LinesMesh createCircle(double r) {
		Vector3[] points = new Vector3[36];
		double x, y;
		double a = 3.14 / 180;
		int p=0;
		for (int i = 0; i <= 360; i = i + 10) {
			x = r * Math.cos(i * a);
			if (i == 90)
				y = r;
			else if (i == 270)
				y = -r;
			else
				y = r * Math.sin(i * a);

			points[p]= new Vector3(x,y,0);
			p++;
		}
		LinesMesh circle = Mesh.CreateLines("",points, this.scene);
		return circle;
	}

	private Mesh sCtl, sX, sY, sZ, sAll, sEndX, sEndY, sEndZ, sEndAll;

	private void createScaleAxes() {
		double r = 0.04;
		double l = this.axesLen * this.axesScale;

		sCtl = new Mesh("sCtl", this.scene);
		this.sAll = Mesh.CreateBox("", r * 2, this.scene);

		this.sX = extrudeBox(r / 2, l);
		this.sX.name = "scaleX";
		this.sY = this.sX.clone("scaleY");
		this.sZ = this.sX.clone("scaleZ");

		this.sX.parent = this.sCtl;
		this.sY.parent = this.sCtl;
		this.sZ.parent = this.sCtl;
		this.sAll.parent = this.sCtl;

		this.sX.rotation.y = 1.57;
		this.sY.rotation.x -= 1.57;

		this.sX.visibility = 0;
		this.sY.visibility = 0;
		this.sZ.visibility = 0;
		this.sAll.visibility = 0;

		this.sX.renderingGroupId = 1;
		this.sY.renderingGroupId = 1;
		this.sZ.renderingGroupId = 1;
		this.sAll.renderingGroupId = 1;

		double cr = r * this.axesScale;
		sEndX = Mesh.CreateBox("", cr, this.scene);
		sEndY = sEndX.clone("");
		sEndZ = sEndX.clone("");
		sEndAll = sEndX.clone("");
		
		sEndX.parent = this.sX;
		sEndY.parent = this.sY;
		sEndZ.parent = this.sZ;
		sEndAll.parent = this.sAll;

		sEndX.position.z = l - cr / 2;
		sEndY.position.z = l - cr / 2;
		sEndZ.position.z = l - cr / 2;

		sEndX.material = this.redMat;
		sEndY.material = this.greenMat;
		sEndZ.material = this.blueMat;
		sEndAll.material = this.whiteMat;

		sEndX.renderingGroupId = 1;
		sEndY.renderingGroupId = 1;
		sEndZ.renderingGroupId = 1;
		sEndAll.renderingGroupId = 1;

	}

	Vector3 localX, localY, localZ, localRot;

	private void setLocalAxes(Mesh mesh) {
		// Matrix meshMatrix = mesh.getWorldMatrix();
		Matrix meshMatrix = mesh.computeWorldMatrix(true);
		Vector3 pos = mesh.position;
		localX = Vector3.TransformCoordinates(Axis.X, meshMatrix).subtract(pos);
		localY = Vector3.TransformCoordinates(Axis.Y, meshMatrix).subtract(pos);
		localZ = Vector3.TransformCoordinates(Axis.Z, meshMatrix).subtract(pos);
		localRot = Vector3.RotationFromAxis(localX, localY, localZ);
		if (local)
			theParent.rotation.copyFrom(this.localRot);
	}

	public void setLocal(boolean l) {
		if (this.local == l)
			return;
		this.local = l;
		if (local)
			this.theParent.rotation.copyFrom(this.localRot);
		else
			this.theParent.rotation.copyFrom(Vector3.Zero());
	}

	public void setTransSnap(boolean s) {
		this.snapT = s;
	}

	public void setRotSnap(boolean s) {
		this.snapR = s;
	}

	public void setTransSnapValue(double t) {
		this.transSnap = t;
	}

	public void setRotSnapValue(double r) {
		this.rotSnap = r;
	}

	// scale up or scale down the axes size as it moves away or closer to camera
	private void setAxesScale() {
		double distFromCamera = 2;
		Vector3 toParent = this.theParent.position.subtract(this.mainCamera.position);
		Vector3 cameraNormal = Vector3.TransformNormal(Axis.Z, this.mainCamera.getWorldMatrix());
		double parentOnNormal = Vector3.Dot(toParent, cameraNormal) / cameraNormal.length();
		double s = parentOnNormal / distFromCamera;
		Vector3 scale = new Vector3(s, s, s);
		this.theParent.scaling = scale;
	}

	public static double getAngle(Vector3 p1, Vector3 p2, Vector3 p, Vector3 cN) {
		Vector3 v1 = p1.subtract(p);
		Vector3 v2 = p2.subtract(p);
		Vector3 n = Vector3.Cross(v1, v2);
		double angle = Math.asin(n.length() / (v1.length() * v2.length()));
		// clockwise or anti clockwise
		// check if camera normal and v1 to v2 normal are same
		// if (!areEqual(n.normalize(), cN.normalize())) {
		if (Vector3.Dot(n, cN) < 0) {
			angle = -1 * angle;
		}
		return angle;
	}
	
	private void createMaterials(Scene scene){
		this.redMat = getStandardMaterial("redMat", Color3.Red(), scene) ;
		this.greenMat = getStandardMaterial("greenMat", Color3.Green(), scene) ;
		this.blueMat = getStandardMaterial("blueMat", Color3.Blue(), scene) ;
		this.whiteMat = getStandardMaterial("whiteMat", Color3.White(), scene) ;
	}
	
	private void disposeMaterials(){
		this.redMat.dispose();
		this.greenMat.dispose();
		this.blueMat.dispose();
		this.whiteMat.dispose();
	}

	private static StandardMaterial getStandardMaterial(String name, Color3 col, Scene scene) {
		StandardMaterial mat = new StandardMaterial(name, scene);
		mat.emissiveColor = col;
		mat.diffuseColor = Color3.Black();
		mat.specularColor = Color3.Black();
		return mat;
	}
}
