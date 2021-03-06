/**
 * Inspired by PDFAnnotate v1.0.0
 * Big thanks to Author!
 * Author: Ravisha Heshan
 */

var PDFAnnotate = function(container_id, url, selectBool, options = {}) {
	this.number_of_pages = 0;
	this.pages_rendered = 0;
	this.active_tool = 0; // 0 - Rectangle, 2 - Text, 3 - Arrow, 
	this.fabricObjects = [];
	this.fabricObjectsData = [];
	this.color = '#212121';
	this.borderColor = '#000000';
	this.borderSize = 1;
	this.font_size = 16;
	this.active_canvas = 0;
	this.container_id = container_id;
	this.url = url;
	this.selectBool = selectBool;
	var inst = this;
	
	

	var loadingTask = PDFJS.getDocument(this.url);
	loadingTask.promise.then(function (pdf) {
	    var scale = 1.3;
	    inst.number_of_pages = pdf.pdfInfo.numPages;

	    for (var i = 1; i <= pdf.pdfInfo.numPages; i++) {
	        pdf.getPage(i).then(function (page) {
	            var viewport = page.getViewport(scale);
	            var canvas = document.createElement('canvas');
	            document.getElementById(inst.container_id).appendChild(canvas);
	            canvas.className = 'pdf-canvas';
	            canvas.height = viewport.height;
	            canvas.width = viewport.width;
	            context = canvas.getContext('2d');

	            var renderContext = {
	                canvasContext: context,
	                viewport: viewport
	            };
	            var renderTask = page.render(renderContext);
	            renderTask.then(function () {
	                $('.pdf-canvas').each(function (index, el) {
	                    $(el).attr('id', 'page-' + (index + 1) + '-canvas');
	                });
	                inst.pages_rendered++;
	                if (inst.pages_rendered == inst.number_of_pages) inst.initFabric();
	            });
	        });
	    }
	}, function (reason) {
	    console.error(reason);
	});

	this.initFabric = function () {
		var inst = this;
	    $('#' + inst.container_id + ' canvas').each(function (index, el) {
	        var background = el.toDataURL("image/png");
	        var fabricObj = new fabric.Canvas(el.id, {
	            freeDrawingBrush: {
	                width: 1,
	                color: inst.color
	            }
	        });
		var arrow = new Rectangle(fabricObj);
			inst.fabricObjects.push(fabricObj);
			if (typeof options.onPageUpdated == 'function') {
				fabricObj.on('object:added', function() {
					var oldValue = Object.assign({}, inst.fabricObjectsData[index]);
					inst.fabricObjectsData[index] = fabricObj.toJSON()
					options.onPageUpdated(index + 1, oldValue, inst.fabricObjectsData[index]) 
				})
			}
	        fabricObj.setBackgroundImage(background, fabricObj.renderAll.bind(fabricObj));
	        $(fabricObj.upperCanvasEl).click(function (event) {
	            inst.active_canvas = index;
	            inst.fabricClickHandler(event, fabricObj);
			});
			fabricObj.on('after:render', function () {
				inst.fabricObjectsData[index] = fabricObj.toJSON()
				fabricObj.off('after:render')
			})
		});
	}

	this.fabricClickHandler = function(event, fabricObj) {
		var inst = this;
	    if (inst.active_tool == 2) {
	        var text = new fabric.IText('Sample text', {
	            left: event.clientX - fabricObj.upperCanvasEl.getBoundingClientRect().left,
	            top: event.clientY - fabricObj.upperCanvasEl.getBoundingClientRect().top,
	            fill: inst.color,
	            fontSize: inst.font_size,
	            selectable: true
	        });
	        fabricObj.add(text);
	        inst.active_tool = 0;
	    }
		else{
			console.log('inst.active_tool: '+inst.active_tool);
			//I think we can put in the logic here to construct free draw rectangle
			
		}
	}
}
 
var Rectangle = (function () {
    function Rectangle(canvas) {
        var inst=this;
        this.canvas = canvas;
        this.className= 'Rectangle';
        this.isDrawing = false;
        this.bindEvents();
    }

Rectangle.prototype.bindEvents = function() {
    var inst = this;
    inst.canvas.on('mouse:down', function(o) {
      inst.onMouseDown(o);
    });
    inst.canvas.on('mouse:move', function(o) {
      inst.onMouseMove(o);
    });
    inst.canvas.on('mouse:up', function(o) {
      inst.onMouseUp(o);
    });
    inst.canvas.on('object:moving', function(o) {
      inst.disable();
    })
  }
    Rectangle.prototype.onMouseUp = function (o) {
      var inst = this;
      inst.disable();
    };

    Rectangle.prototype.onMouseMove = function (o) {
      var inst = this;
      

      if(!inst.isEnable()){ return; }
      console.log("mouse move rectange");
      var pointer = inst.canvas.getPointer(o.e);
      var activeObj = inst.canvas.getActiveObject();

      activeObj.stroke= 'red',
      activeObj.strokeWidth= 1;
      activeObj.fill = 'rgba(255, 0, 0, 0.3)';

      if(origX > pointer.x){
          activeObj.set({ left: Math.abs(pointer.x) }); 
      }
      if(origY > pointer.y){
          activeObj.set({ top: Math.abs(pointer.y) });
      }

      activeObj.set({ width: Math.abs(origX - pointer.x) });
      activeObj.set({ height: Math.abs(origY - pointer.y) });

      activeObj.setCoords();
      inst.canvas.renderAll();

    };

    Rectangle.prototype.onMouseDown = function (o) {
      var inst = this;
      inst.enable();
	    console.log('o: ',o);

      var pointer = inst.canvas.getPointer(o.e);
      origX = pointer.x;
      origY = pointer.y;

    	var rect = new fabric.Rect({
          left: origX,
          top: origY,
          originX: 'left',
          originY: 'top',
          width: pointer.x-origX,
          height: pointer.y-origY,
          angle: 0,
          transparentCorners: false,
          hasBorders: false,
          hasControls: false
      });
	//add custom property as per here: http://fabricjs.com/fabric-intro-part-3
	rect.toObject = (function(toObject) {
  			return function() {
    				return fabric.util.object.extend(toObject.call(this), {
      				name: this.name
    				});
  			};
	})(rect.toObject);
	rect.name = this.objectId;
  	  inst.canvas.add(rect).setActiveObject(rect);
    };

    Rectangle.prototype.isEnable = function(){
      return this.isDrawing;
    }

    Rectangle.prototype.enable = function(){
      this.isDrawing = true;
    }

    Rectangle.prototype.disable = function(){
      this.isDrawing = false;
    }

    return Rectangle;
}());
PDFAnnotate.prototype.enableSelector = function () {
	var inst = this;
	inst.active_tool = 0;
	if (inst.fabricObjects.length > 0) {
	    $.each(inst.fabricObjects, function (index, fabricObj) {
	        fabricObj.isDrawingMode = false;
	    });
	}
}

PDFAnnotate.prototype.enablePencil = function () {
	var inst = this;
	inst.active_tool = 1;
	if (inst.fabricObjects.length > 0) {
	    $.each(inst.fabricObjects, function (index, fabricObj) {
	        fabricObj.isDrawingMode = true;
	    });
	}
}

PDFAnnotate.prototype.enableAddText = function () {
	var inst = this;
	inst.active_tool = 2;
	if (inst.fabricObjects.length > 0) {
	    $.each(inst.fabricObjects, function (index, fabricObj) {
	        fabricObj.isDrawingMode = false;
	    });
	}
}

PDFAnnotate.prototype.enableRectangle = function (top,left,width,height) {
	var inst = this;
	var fabricObj = inst.fabricObjects[inst.active_canvas];
	inst.active_tool = 4;
	if (inst.fabricObjects.length > 0) {
		$.each(inst.fabricObjects, function (index, fabricObj) {
			fabricObj.isDrawingMode = false;
		});
	}

	var rect = new fabric.Rect({
		top:top,
		left:left,
		width: width,
		height: height,
		fill: inst.color,
		stroke: inst.borderColor,
		strokeSize: inst.borderSize
	});
	fabricObj.add(rect);
}

PDFAnnotate.prototype.enableAddArrow = function () {
	var inst = this;
	inst.active_tool = 3;
	if (inst.fabricObjects.length > 0) {
	    $.each(inst.fabricObjects, function (index, fabricObj) {
	        fabricObj.isDrawingMode = false;
	        new Arrow(fabricObj, inst.color, function () {
	            inst.active_tool = 0;
	        });
	    });
	}
}

PDFAnnotate.prototype.deleteSelectedObject = function () {
	var inst = this;
	var activeObject = inst.fabricObjects[inst.active_canvas].getActiveObject();
	if (activeObject)
	{
	    if (confirm('Are you sure ?')) inst.fabricObjects[inst.active_canvas].remove(activeObject);
	}
}

PDFAnnotate.prototype.savePdf = function () {
	var inst = this;
	var doc = new jsPDF();
	$.each(inst.fabricObjects, function (index, fabricObj) {
	    if (index != 0) {
	        doc.addPage();
	        doc.setPage(index + 1);
	    }
	    doc.addImage(fabricObj.toDataURL(), 'png', 0, 0);
	});
	doc.save('sample.pdf');
}

PDFAnnotate.prototype.setBrushSize = function (size) {
	var inst = this;
	$.each(inst.fabricObjects, function (index, fabricObj) {
	    fabricObj.freeDrawingBrush.width = size;
	});
}

PDFAnnotate.prototype.setColor = function (color) {
	var inst = this;
	inst.color = color;
	$.each(inst.fabricObjects, function (index, fabricObj) {
        fabricObj.freeDrawingBrush.color = color;
    });
}

PDFAnnotate.prototype.setBorderColor = function (color) {
	var inst = this;
	inst.borderColor = color;
}

PDFAnnotate.prototype.setFontSize = function (size) {
	this.font_size = size;
}

PDFAnnotate.prototype.setBorderSize = function (size) {
	this.borderSize = size;
}

PDFAnnotate.prototype.clearActivePage = function () {
	var inst = this;
	var fabricObj = inst.fabricObjects[inst.active_canvas];
	var bg = fabricObj.backgroundImage;
	if (confirm('Are you sure?')) {
	    fabricObj.clear();
	    fabricObj.setBackgroundImage(bg, fabricObj.renderAll.bind(fabricObj));
	}
}

PDFAnnotate.prototype.serializePdf = function() {
	var inst = this;
	return JSON.stringify(inst.fabricObjects, null, 4);
}

PDFAnnotate.prototype.getFabricObjects = function() {
	var inst = this;
	//return inst.fabricObjects;
	var imageItems=[];
	$.each(inst.fabricObjects, function (index, fabricObj) {
	       //each page
		//if fabricObj._objects.length>1 we put in an annotation
	  	console.log('fabricObj:',fabricObj);
		//console.log('fabricObj._objects:',fabricObj._objects);
		//console.log('fabricObj._objects.length:'+fabricObj._objects.length);
	    	if(fabricObj._objects.length>0){
		    $.each(fabricObj._objects, function (index, item) {
			    //for each object, crop image 
			    //help from: https://stackoverflow.com/questions/18732876/crop-functionality-using-fabricjs
				var cropped = new Image();
			    	var canvas = item.canvas;
			    	cropped.src = canvas.toDataURL({
				left: item.left,
				top: item.top,
				width: item.width,
				height: item.height
			    });
			    console.log('cropped.src',cropped.src);
			    imageItems.push(cropped.src);
			    console.log('imageItems',imageItems);
		    });
	    }
	    
	});
	console.log('about to return imageItems');
	return imageItems
}

PDFAnnotate.prototype.getFabricObjectsData = function() {
	var inst = this;
	var areaDataItems=[];
	$.each(inst.fabricObjects, function (index, fabricObj) {
	       //each page
		//if fabricObj._objects.length>1 we put in an annotation
	  	//console.log('fabricObj:',fabricObj);
		//console.log('fabricObj._objects:',fabricObj._objects);
		//console.log('fabricObj._objects.length:'+fabricObj._objects.length);
	    	if(fabricObj._objects.length>0){
		  var pageIndex = index+1;
		    $.each(fabricObj._objects, function (index, item) {
			    //for each object, crop image 
			    var itemData = {
				    left: item.left,
				    top: item.top,
				    width: item.width,
				    height: item.height,
				    name: item.name,
				    page: pageIndex,
				    canvasWidth: item.canvas.width,
				    canvasHeight: item.canvas.height
			    }
			    console.log('itemData',itemData);
			    areaDataItems.push(itemData);
			    console.log('areaDataItems',areaDataItems);
		    });
	    }
	    
	});
	console.log('about to return areaDataItems');
	return areaDataItems
}

PDFAnnotate.prototype.loadFromJSON = function(jsonData) {
	var inst = this;
	$.each(inst.fabricObjects, function (index, fabricObj) {
		if (jsonData.length > index) {
			fabricObj.loadFromJSON(jsonData[index], function () {
				inst.fabricObjectsData[index] = fabricObj.toJSON()
			})
		}
	})
}

Rectangle.prototype.bindEvents = function() {
    var inst = this;
    inst.canvas.on('mouse:down', function(o) {
      inst.onMouseDown(o);
    });
    inst.canvas.on('mouse:move', function(o) {
      inst.onMouseMove(o);
    });
    inst.canvas.on('mouse:up', function(o) {
      inst.onMouseUp(o);
    });
    inst.canvas.on('object:moving', function(o) {
      inst.disable();
    })
  }
    Rectangle.prototype.onMouseUp = function (o) {
      var inst = this;
      inst.disable();
    };

    Rectangle.prototype.onMouseMove = function (o) {
      var inst = this;
      

      if(!inst.isEnable()){ return; }
      console.log("mouse move rectange");
      var pointer = inst.canvas.getPointer(o.e);
      var activeObj = inst.canvas.getActiveObject();

      activeObj.stroke= 'red',
      activeObj.strokeWidth= 1;
      activeObj.fill = 'transparent';

      if(origX > pointer.x){
          activeObj.set({ left: Math.abs(pointer.x) }); 
      }
      if(origY > pointer.y){
          activeObj.set({ top: Math.abs(pointer.y) });
      }

      activeObj.set({ width: Math.abs(origX - pointer.x) });
      activeObj.set({ height: Math.abs(origY - pointer.y) });

      activeObj.setCoords();
      inst.canvas.renderAll();

    };

    Rectangle.prototype.onMouseDown = function (o) {
      var inst = this;
      inst.enable();

	var pointer = inst.canvas.getPointer(o.e);
      origX = pointer.x;
      origY = pointer.y;
    
    	var rect = new fabric.Rect({
          left: origX,
          top: origY,
          originX: 'left',
          originY: 'top',
          width: pointer.x-origX,
          height: pointer.y-origY,
          angle: 0,
          transparentCorners: false,
          hasBorders: false,
          hasControls: false
      });
	//add custom property as per here: http://fabricjs.com/fabric-intro-part-3
	rect.toObject = (function(toObject) {
  			return function() {
    				return fabric.util.object.extend(toObject.call(this), {
      				name: this.name
    				});
  			};
	})(rect.toObject);
	if(this.selectBool == true){
	rect.name = document.getElementById("questionSelect").selectedOptions[0].value;
	}
  	inst.canvas.add(rect).setActiveObject(rect);
    };

    Rectangle.prototype.isEnable = function(){
      return this.isDrawing;
    }

    Rectangle.prototype.enable = function(){
      this.isDrawing = true;
    }

    Rectangle.prototype.disable = function(){
      this.isDrawing = false;
    }
