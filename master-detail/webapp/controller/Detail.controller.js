sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/Sorter",
    "sap/ui/model/FilterOperator",
    "sap/m/GroupHeaderListItem",
    "sap/ui/Device",
    "sap/ui/core/Fragment",
    "../model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/Sorter",
    "sap/ui/model/FilterOperator",
    "sap/m/GroupHeaderListItem",
    "sap/ui/Device",
    "sap/ui/core/Fragment",
    "../model/formatter",
    "sap/m/Dialog",
    "sap/m/DialogType", 
    "sap/m/Button", 
    "sap/m/ButtonType", 
    "sap/m/Text", 
    "sap/m/MessageToast", 
    "sap/m/MessageBox", 
    "sap/m/Input",
    "sap/m/FlexBox",
    "sap/m/Label",
    "sap/m/library"
], function (BaseController, JSONModel, formatter, mobileLibrary, Filter, Sorter, FilterOperator, GroupHeaderListItem, Device, Fragment, Dialog, DialogType, Button, ButtonType, Text, MessageToast, MessageBox, Input, Label) {
    "use strict";

    // shortcut for sap.m.URLHelper
    var URLHelper = mobileLibrary.URLHelper;

    return BaseController.extend("masterdetail.controller.Detail", {

        formatter: formatter,

        /* =========================================================== */
        /* lifecycle methods                                           */
        /* =========================================================== */

        onInit: function () {
            // Model used to manipulate control states. The chosen values make sure,
            // detail page is busy indication immediately so there is no break in
            // between the busy indication for loading the view's meta data
            var oViewModel = new JSONModel({
                busy : false,
                delay : 0,
                lineItemListTitle : this.getResourceBundle().getText("detailLineItemTableHeading")
            });

            this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);

            this.setModel(oViewModel, "detailView");

            this.getOwnerComponent().getModel().metadataLoaded().then(this._onMetadataLoaded.bind(this));
        },

        /* =========================================================== */
        /* event handlers                                              */
        /* =========================================================== */

        /**
         * Event handler when the share by E-Mail button has been clicked
         * @public
         */
        onDeleteClick: function(oEvent) {
            const clickedItemPath = oEvent.getSource().getBindingContext().getPath();	
            var oModel = this.getView().getModel();
        
            oModel.remove(clickedItemPath, {
                success: function (data) {
                    MessageBox.success("Product has been deleted!", {
                        title: "Success"
                    })
                },
                error: function (e) {
                    alert("error");
                }
            });
        },



        onSendEmailPress: function () {
            var oViewModel = this.getModel("detailView");

            URLHelper.triggerEmail(
                null,
                oViewModel.getProperty("/shareSendEmailSubject"),
                oViewModel.getProperty("/shareSendEmailMessage")
            );
        },

        onUpdateClick: function(oEvent){
            var oModel = this.getView().getModel();

            const clickedItemContext = oEvent.getSource().getBindingContext()
            const clickedItemPath = clickedItemContext.getPath();
            const clickedItemObject = clickedItemContext.getObject();
            const prevName = clickedItemObject.Name;
            const prevPrice = clickedItemObject.Price;
            const prevDescription = clickedItemObject.Description;
            const prevRating = clickedItemObject.Rating;

            this.oApproveDialog = new Dialog({
                type: DialogType.Message,
                title: "Update",
                content: [
                    new sap.m.Label({text:"Name:"}),
                    new Input({
                        id: "nameInput",
                        value: prevName
                    }),
                    new sap.m.Label({text:"Price:"}),
                    new Input({
                        id: "priceInput",
                        value: prevPrice
                    }),
                    new sap.m.Label({text:"Description:"}),
                    new Input({
                        id: "descriptionInput",
                        value: prevDescription
                    }),
                    new sap.m.Label({text:"Rating:"}),
                    new Input({
                        id: "ratingInput",
                        value: prevRating
                    }),
                ], 
                beginButton: new Button({
                    type: ButtonType.Emphasized,
                    text: "Submit",
                    press: function () {
                        const newUpdate = this.oApproveDialog.getContent()
                        const newName = newUpdate[1].getValue()
                        oModel.read("/Products", {
                            success: function (data) {
                                console.log(data.results)
                                const isNameFree = !data.results?.find(cat => cat.Name === newName);

                                if (isNameFree) {
                                    this._updateConfirmDialog(prevName, newUpdate, clickedItemPath);
                                } else {
                                    console.log("is not free")
                                    MessageBox.error("Product with that name already exists!", {
                                        title: "Error"
                                    })
                                }
                                this.oApproveDialog.destroy();

                            }.bind(this)
                        });
                    }.bind(this)
                }),
                endButton: new Button({
                    text: "Cancel",
                    press: function() {
                        this.oApproveDialog.destroy();
                    }.bind(this)
                })
            });
            this.oApproveDialog.open();
        },
        _updateConfirmDialog: function(prevName, newUpdate, clickedItemPath){
            var oModel = this.getView().getModel();
            var newName = newUpdate[1].getValue()
            var newPrice = newUpdate[3].getValue()
            var newDescription = newUpdate[5].getValue()
            var newRating = newUpdate[7].getValue()
            console.log(newName)

            this.oConfirmDialog = new Dialog({
                type: DialogType.Message,
                title: "Confirmation",
                content: new Text({
                    text: `Are you sure you want to rename product from ${prevName} to ${newName}?`
                }),
                beginButton: new Button({
                    type: ButtonType.Accept,
                    text: "Yes",
                    press: function () {
                        var oCat = {
                            "Name": newName,
                            "Price": newPrice,
                            "Description": newDescription,
                            "Rating": newRating,

                    }
                        oModel.update(clickedItemPath, oCat, {
                            merge: true, /* if set to true: PATCH/MERGE/ */
                            success: function () {MessageToast.show("Success!");},
                            error: function (oError) {MessageToast.show("Something went wrong!");}
                        });
                        this.oConfirmDialog.destroy();
                    }.bind(this)
                }),
                endButton: new Button({
                    text: "No",
                    type: ButtonType.Reject,
                    press: function () {
                        this.oConfirmDialog.destroy();
                    }.bind(this)
                })
            });
            this.oConfirmDialog.open();
        },

        
        /**
         * Updates the item count within the line item table's header
         * @param {object} oEvent an event containing the total number of items in the list
         * @private
         */
        
        handleRowPress: function(oEvent){
            const clickedItem = oEvent.getSource().getBindingContext().getObject()
            
            this.getRouter().navTo("supp", { 
            objectId : clickedItem.ID
            })
            },

        
        onListUpdateFinished: function (oEvent) {
            var sTitle,
                iTotalItems = oEvent.getParameter("total"),
                oViewModel = this.getModel("detailView");

            // only update the counter if the length is final
            if (this.byId("lineItemsList").getBinding("items").isLengthFinal()) {
                if (iTotalItems) {
                    sTitle = this.getResourceBundle().getText("detailLineItemTableHeadingCount", [iTotalItems]);
                } else {
                    //Display 'Line Items' instead of 'Line items (0)'
                    sTitle = this.getResourceBundle().getText("detailLineItemTableHeading");
                }
                oViewModel.setProperty("/lineItemListTitle", sTitle);
            }
        },

        /* =========================================================== */
        /* begin: internal methods                                     */
        /* =========================================================== */

        /**
         * Binds the view to the object path and expands the aggregated line items.
         * @function
         * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
         * @private
         */
        _onObjectMatched: function (oEvent) {
            var sObjectId =  oEvent.getParameter("arguments").objectId;
            this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
            this.getModel().metadataLoaded().then( function() {
                var sObjectPath = this.getModel().createKey("Categories", {
                    ID:  sObjectId
                });
                this._bindView("/" + sObjectPath);
            }.bind(this));
        },

        /**
         * Binds the view to the object path. Makes sure that detail view displays
         * a busy indicator while data for the corresponding element binding is loaded.
         * @function
         * @param {string} sObjectPath path to the object to be bound to the view.
         * @private
         */
        _bindView: function (sObjectPath) {
            // Set busy indicator during view binding
            var oViewModel = this.getModel("detailView");

            // If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
            oViewModel.setProperty("/busy", false);

            this.getView().bindElement({
                path : sObjectPath,
                events: {
                    change : this._onBindingChange.bind(this),
                    dataRequested : function () {
                        oViewModel.setProperty("/busy", true);
                    },
                    dataReceived: function () {
                        oViewModel.setProperty("/busy", false);
                    }
                }
            });
        },

        _onBindingChange: function () {
            var oView = this.getView(),
                oElementBinding = oView.getElementBinding();

            // No data for the binding
            if (!oElementBinding.getBoundContext()) {
                this.getRouter().getTargets().display("detailObjectNotFound");
                // if object could not be found, the selection in the list
                // does not make sense anymore.
                this.getOwnerComponent().oListSelector.clearListListSelection();
                return;
            }

            var sPath = oElementBinding.getPath(),
                oResourceBundle = this.getResourceBundle(),
                oObject = oView.getModel().getObject(sPath),
                sObjectId = oObject.ID,
                sObjectName = oObject.Name,
                oViewModel = this.getModel("detailView");

            this.getOwnerComponent().oListSelector.selectAListItem(sPath);

            oViewModel.setProperty("/shareSendEmailSubject",
                oResourceBundle.getText("shareSendEmailObjectSubject", [sObjectId]));
            oViewModel.setProperty("/shareSendEmailMessage",
                oResourceBundle.getText("shareSendEmailObjectMessage", [sObjectName, sObjectId, location.href]));
        },

        _onMetadataLoaded: function () {
            // Store original busy indicator delay for the detail view
            var iOriginalViewBusyDelay = this.getView().getBusyIndicatorDelay(),
                oViewModel = this.getModel("detailView"),
                oLineItemTable = this.byId("lineItemsList"),
                iOriginalLineItemTableBusyDelay = oLineItemTable.getBusyIndicatorDelay();

            // Make sure busy indicator is displayed immediately when
            // detail view is displayed for the first time
            oViewModel.setProperty("/delay", 0);
            oViewModel.setProperty("/lineItemTableDelay", 0);

            oLineItemTable.attachEventOnce("updateFinished", function() {
                // Restore original busy indicator delay for line item table
                oViewModel.setProperty("/lineItemTableDelay", iOriginalLineItemTableBusyDelay);
            });

            // Binding the view will set it to not busy - so the view is always busy if it is not bound
            oViewModel.setProperty("/busy", true);
            // Restore original busy indicator delay for the detail view
            oViewModel.setProperty("/delay", iOriginalViewBusyDelay);
        },

        /**
         * Set the full screen mode to false and navigate to list page
         */
        onCloseDetailPress: function () {
            this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", false);
            // No item should be selected on list after detail page is closed
            this.getOwnerComponent().oListSelector.clearListListSelection();
            this.getRouter().navTo("list");
        },

        /**
         * Toggle between full and non full screen mode.
         */


        // onAddProductClick: function() { 
        //     this.oApproveDialog = new Dialog({
        //      type: DialogType.Message, 
        //     title: "Add product", 
        //     content: new Input({
        //      id: "nameInput" 
        //     }),
        //     beginButton: new Button({
        //      type: ButtonType.Emphasized, 
        //     text: "Submit", 
        //     press: function () {
        //       var oCat = {
        //     "ID": Math.floor(Math. random() * 101) + 5,
        //     "Name": this.oApproveDialog.getContent()[0].getValue().length === 0 ? "Default" : this.oApproveDialog.getContent()[0].getValue() 
        //     } 
        //     var oModel = this.getView().getModel();
        //     oModel.create("/Product", oCat, {
        //      success: function () { MessageToast.show("Success!"); }, 
        //     error: function (oError) { MessageToast.show("Something went wrong!"); }
        //     });
        //      this .oApproveDialog.destroy();
        //     }.bind(this)
        //      }), 
        //     endButton: new Button ({
        //      text: "Cancel", 
        //     press: function () {
        //      this .oApproveDialog.destroy();
        //     }.bind(this)
        //     })
        //     });
        //     this .oApproveDialog.open();
        //     },


// onAddProductClick: function() { 
//             this.oApproveDialog = new Dialog({
//              type: DialogType.Message, 
//             title: "Add product", 
//             content: new Input({
//              id: "nameInput" 
//             }),
//             beginButton: new Button({
//              type: ButtonType.Emphasized, 
//             text: "Submit", 
//             press: function () {
//               var oCat = {
//             "ID": Math.floor(Math. random() * 101) + 5,
//             "Name": this.oApproveDialog.getContent()[0].getValue().length === 0 ? "Default" : this.oApproveDialog.getContent()[0].getValue() 
//             } 
//             var oModel = this.getView().getModel();
//             oModel.create("/Products", oCat, {
//              success: function () { MessageToast.show("Success!"); }, 
//             error: function (oError) { MessageToast.show("Something went wrong!"); }
//             });
//              this .oApproveDialog.destroy();
//             }.bind(this)
//              }), 
//             endButton: new Button ({
//              text: "Cancel", 
//             press: function () {
//              this .oApproveDialog.destroy();
//             }.bind(this)
//             })
//             });
//             this .oApproveDialog.open();
//             },


            onAddProductClick: function() { 
                this.oApproveDialog = new Dialog({
                 type: DialogType.Message, 
                title: "Add product", 
                content: [
                    
                    new sap.m.Label({text:"Name:"}),
                    new Input({
                        id: "nameInput"
                    }),
                    new sap.m.Label({text:"Price:"}),
                    new sap.m.Input({
                        id: "priceInput"
                    }),
                    new sap.m.Label({text:"Description:"}),
                    new sap.m.Input({
                        id: "descriptionInput"
                    }),
                    new sap.m.Label({text:"Rating:"}),
                    new sap.m.Input({
                        id: "ratingInput"
                    }),
                    // new Input({
                    //     id: "categoryInput"
                    // })
                ], 
                beginButton: new Button({
                 type: ButtonType.Emphasized, 
                text: "Submit", 
                press: function () {
                //   var oCat = {
                // "ID": Math.floor(Math. random() * 101) + 5,
                // "Name": this.oApproveDialog.getContent()[0].getValue().length === 0 ? "Default" : this.oApproveDialog.getContent()[0].getValue() 
                // } 
                var oModel = this.getView().getModel();

            var oEntry = {};

                    var that = this;

            oModel.read("/Products",{
                sorters:  [new sap.ui.model.Sorter("ID",true)],
                success: function(odata){
                    console.log(odata.results);
                    console.log(odata.results[0].ID);
                    oEntry.ID = odata.results[0].ID + 1;
                    console.log(oEntry.ID);
                    var oCat = {
                        "ID": oEntry.ID,
                        "Name": that.oApproveDialog.getContent()[1].getValue().length === 0 ? "Default" : that.oApproveDialog.getContent()[1].getValue(), 
                        "Price": that.oApproveDialog.getContent()[3].getValue().length === 0 ? "Default" : that.oApproveDialog.getContent()[3].getValue(),
                        "Description": that.oApproveDialog.getContent()[5].getValue().length === 0 ? "Default" : that.oApproveDialog.getContent()[5].getValue(),
                        "Rating": that.oApproveDialog.getContent()[7].getValue().length === 0 ? "Default" : that.oApproveDialog.getContent()[7].getValue(),
                        // "Category": {
                        //     "ID": 1,
                        //     "Name": "Beverages"
                        //     }
                        } ;
                    oModel.create("/Products", oCat, {
                        success: function () { MessageToast.show("Success!");  
                        that.oApproveDialog.destroy()},
                       error: function (oError) { MessageToast.show("Something went wrong!"); }
                       });
                }
            });

            // var oCat = {
            //     // "ID": oEntry.ID,
            //     "ID": Math.floor(Math. random() * 101) + 5,
            //     "Name": this.oApproveDialog.getContent()[0].getValue().length === 0 ? "Default" : this.oApproveDialog.getContent()[0].getValue() 
            //     } 



                // oModel.create("/Categories", oCat, {
                //  success: function () { MessageToast.show("Success!"); }, 
                // error: function (oError) { MessageToast.show("Something went wrong!"); }
                // });
                //  this .oApproveDialog.destroy();
                }.bind(this)
                 }), 
                endButton: new Button ({
                 text: "Cancel", 
                press: function () {
                 this .oApproveDialog.destroy();
                }.bind(this)
                })
                });
                this .oApproveDialog.open();
                },




//           onAddProductClick: function() { 
//             this.oApproveDialog = new Dialog({
//              type: DialogType.Message, 
//             title: "Add product", 
//             content: new Input({
//              id: "nameInput" 
//             }),

            

//             // content: new Input({
//             //     id: "descriptionInput" 
//             //    }),
//             beginButton: new Button({
//              type: ButtonType.Emphasized, 
//             text: "Submit", 
//             press: function () {
//             //   var oCat = {
//             // "ID": Math.floor(Math. random() * 101) + 5,
//             // "Name": this.oApproveDialog.getContent()[0].getValue().length === 0 ? "Default" : this.oApproveDialog.getContent()[0].getValue(), 
//             // // "Description": this.oApproveDialog.getContent()[1].getValue().length === 0 ? "Default" : this.oApproveDialog.getContent()[1].getValue()
//             // "Description": this.getView().byId("decsriptioninput").getValue()
//             //} 
//             var oCat = {
//                 "ID": Math.floor(Math. random() * 101) + 5,
//                 //"ID": oEntry.ID,oEntry["ID"]
//                 "Name": this.oApproveDialog.getContent()[0].getValue().length === 0 ? "Default" : this.oApproveDialog.getContent()[0].getValue(), }
           
//             // oModel.read("/Products(0)", {
//             //     success: function () { MessageToast.show("Success!"); }, 
//             //    error: function (oError) { MessageToast.show("Something went wrong!"); } });//{success: mySuccessHandler, error: myErrorHandler});


//              //  oModel.read("/Products(1)", {success: mySuccessHandler, error: myErrorHandler});

            
            
            
            
            
//              var oModel = this.getView().getModel();

//             //oModel.read("/Products(1)", {success: mySuccessHandler, error: myErrorHandler});

//             // oModel.read("/Products",{
// 			// 	//sorters:  [new sap.ui.model.Sorter("ID",true)],
// 			//  	success: function(odata){
// 			//  		console.log("MAX ID===",odata.results[0].ID);
// 			//  		//oEntry.ID = odata.results[1].ID + 1;
					
// 			// 		},	
			 	
// 			// });

// var oEntry = {};

//             oModel.read("/Products",{
//                 sorters:  [new sap.ui.model.Sorter("ID",true)],
//                 success: function(odata){
//                     console.log(odata.results);
//                     console.log(odata.results[0].ID);
//                     oEntry.ID = odata.results[0].ID + 1;
//                     console.log(oEntry.ID);
//                     // odata.results.forEach(ele=>{
//                     //     statusCount[ele.ID].totalCount = statusCount[ele.ID].totalCount+1;
//                     //});
//                    //console.log(statusCount);
//                    // var last_nr = length
//                     //console.log(last_nr);
//                     // var statusOModel = new JSONModel({data: statusCount});
//                     // view.setModel(statusOModel,"status");
//                 }
//             });


            

//             oModel.create("/Products", oCat, {
//              success: function () { MessageToast.show("Success!"); }, 
//             error: function (oError) { MessageToast.show("Something went wrong!"); }
//             });
//              this .oApproveDialog.destroy();
//             }.bind(this)
//              }), 
//             endButton: new Button ({
//              text: "Cancel", 
//             press: function () {
//              this .oApproveDialog.destroy();
//             }.bind(this)
//             })
//             });
//             this .oApproveDialog.open();
//             },

            




        toggleFullScreen: function () {
            var bFullScreen = this.getModel("appView").getProperty("/actionButtonsInfo/midColumn/fullScreen");
            this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", !bFullScreen);
            if (!bFullScreen) {
                // store current layout and go full screen
                this.getModel("appView").setProperty("/previousLayout", this.getModel("appView").getProperty("/layout"));
                this.getModel("appView").setProperty("/layout", "MidColumnFullScreen");
            } else {
                // reset to previous layout
                this.getModel("appView").setProperty("/layout",  this.getModel("appView").getProperty("/previousLayout"));
            }
        },





        
 

        
    });

});