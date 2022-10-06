var tableData = [];
var tableDataModified = [];
var tableDataAdded = [];
var newRows = 0;
var rowsToDelete = [];
var otpToLoad = "";



function loadTable(otp){
    userTable = document.getElementById('inside-table');
    
    var i = 0;
    var xmlreq = new XMLHttpRequest();

    xmlreq.onreadystatechange = function(){
        if(this.readyState == 4 && this.status==200){
            
            rowsOfTable = JSON.parse(xmlreq.responseText).length;
            
            JSON.parse(xmlreq.responseText).forEach(function(user, indexOfUser, originalArray){
                
                var el= document.createElement("tr");
                el.innerHTML= `
                <td class="table-column"><div id = "row${indexOfUser}-id" class="table-cell">${user.id}</div></td>
                <td class="table-column"><div id = "row${indexOfUser}-username"class="table-cell" onblur="cellchange()" contenteditable="plaintext-only">${user.username}</div></td>
                <td class="table-column"><div id = "row${indexOfUser}-name" class="table-cell" onblur="cellchange()" contenteditable="plaintext-only">${user.name}</div></td>
                <td class="table-column"><div id = "row${indexOfUser}-lastname" class="table-cell" onblur="cellchange()" contenteditable="plaintext-only">${user.lastname}</div></td>
                <td class="table-column"><div id = "row${indexOfUser}-email" class="table-cell" onblur="cellchange()" contenteditable="plaintext-only">${user.email}</div></td>
                <td class="table-column"><div id = "row${indexOfUser}-password" class="table-cell" onblur="cellchange()" contenteditable="plaintext-only">${user.password}</div></td>
                <td class="table-column"><div id = "row${indexOfUser}-isAdmin" class="table-cell" onblur="cellchange()" contenteditable="plaintext-only">${user.isAdmin}</div></td>
                <td class="table-column"><div id = "row${indexOfUser}-isActivated" class="table-cell" onblur="cellchange()" contenteditable="plaintext-only">${user.isActivated}</div></td>
                <td class="table-column"><div id = "row${indexOfUser}-registrationDate" class="table-cell" >${user.registrationDate}</div></td>
                <td class="table-column"><div id = "row${indexOfUser}-accessLevel" class="table-cell" onblur="cellchange()" contenteditable="plaintext-only">${user.accessLevel}</div></td>`
                el.setAttribute("id",`row${indexOfUser}`)
    
                userTable.appendChild(el);

                tableData.push({
                    row: indexOfUser,
                    id: user.id,
                    username: user.username,
                    name: user.name,
                    lastname: user.lastname,
                    email: user.email,
                    password: user.password,
                    isAdmin: user.isAdmin,
                    isActivated: user.isActivated,
                    registrationDate: user.registrationDate,
                    accessLevel: user.accessLevel
                });
                console.log(tableData)
                document.getElementById('otp-input').setAttribute("style", "display:none");
            });
            
        };
    };
    xmlreq.open('GET', `users/getall/${otp}`);
    xmlreq.send();
    
};




function otpinput(){
    otpToLoad = document.getElementById('otp-for-load').value;
    loadTable(otpToLoad);
    
    //document.getElementById('otp-input').setAttribute("style", "display:none")
    
}


function reloadtable(){
    if(otpToLoad){
        userTable = document.getElementById('inside-table');
        userTable.innerHTML="";
        tableData=[];
        tableDataAdded=[];
        tableDataModified=[];
        rowsToDelete=[];
        deleteList = document.getElementById('to-delete');
        deleteList.innerHTML="";
        document.getElementById('changes-to-show-text').innerHTML="";
        loadTable(otpToLoad);
    }
    
}





function submitdata(e){
    
    var changesMade = false;
    otpToSend = document.getElementById('otpInput').value;
    
    var dataToSubmit = {};

    if(tableDataModified.length){
        changesMade = true;
        dataToSubmit["update"] = tableDataModified;
    }

    if(tableDataAdded.length){
        changesMade = true;
        dataToSubmit["insert"] = tableDataAdded;
    }

    if(rowsToDelete.length){
        changesMade = true;
        dataToSubmit["delete"] = rowsToDelete;
    }
    console.log(dataToSubmit)
    if(changesMade){
        var xmlHTTP = new XMLHttpRequest();
        xmlHTTP.open("POST", `/users/updateusers/${otpToSend}`);
        xmlHTTP.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
        xmlHTTP.send(JSON.stringify(dataToSubmit));

        xmlHTTP.onreadystatechange = function(){
            
            if (this.readyState==4){
                messageToAdmin(this.responseText);
            }
        };


    }
    




}


function messageToAdmin(messageFromServer){
    
    document.getElementById('finalmessage').style.display="block";
    document.getElementById('message').innerText=messageFromServer;
    console.log(messageFromServer)
    
    
}



function cellchange(){
    
    var cellId = this.event.target.id;
    var cellVal = this.event.target.innerHTML.trim();
    cellVal = cellVal.split(" ").join("");
    this.event.target.innerHTML = cellVal;
    
    
    var currentRowData = tableData[parseInt(this.event.target.parentElement.parentElement.id.substring(3))]
    var cellType = this.event.target.id.split("-")[1];
    
    

    modifiedRowExists = false;
    indexOfModifiedRow = 0;
    tableDataModified.forEach((modifiedUser, index)=>{
        
        if (currentRowData.id == modifiedUser.id) {
            
            modifiedRowExists = true;
            indexOfModifiedRow = index;
        }
    })
    
    if(modifiedRowExists){
        

        if(typeof tableData[this.event.target.parentElement.parentElement.id.substring(3)][cellType] == "string"){
            varToPass=tableData[this.event.target.parentElement.parentElement.id.substring(3)][cellType].trim();
        }else{
            varToPass = tableData[this.event.target.parentElement.parentElement.id.substring(3)][cellType];
        }

        if (!(varToPass == cellVal)){
            
            tableDataModified[indexOfModifiedRow][cellType]=cellVal;
        } else{
            if(tableDataModified[indexOfModifiedRow]){  
                delete tableDataModified[indexOfModifiedRow][cellType];
                
                if (Object.keys(tableDataModified[indexOfModifiedRow]).length<2){
                    tableDataModified.splice(indexOfModifiedRow,1);
                }
            }
        }
        
        
    }else{

        if(typeof tableData[this.event.target.parentElement.parentElement.id.substring(3)][cellType] == "string"){
            otherVarToPass = tableData[this.event.target.parentElement.parentElement.id.substring(3)][cellType].trim();
        } else{
            otherVarToPass = tableData[this.event.target.parentElement.parentElement.id.substring(3)][cellType];
        }

        if (!(otherVarToPass == cellVal)){

        
            tableDataModified.push({
                id: currentRowData.id,
                [cellType]: cellVal
        
            });
        }
        
    }


    
    
    confirmchange();


    console.log('data modified', tableDataModified)
    
}


function adduserrow(){
    userTable = document.getElementById('inside-table');
    newRow = document.createElement('tr');
    newRow.innerHTML = `<td class="table-column"><div id = "new-row${newRows}-id" class="table-cell">Reserved UUID</div></td>
    <td class="table-column"><div id = "new-row${newRows}-username"class="table-cell" onfocus = "window.getSelection().selectAllChildren(event.target)" onblur="newcellchange()" contenteditable="plaintext-only">insert usrname</div></td>
    <td class="table-column"><div id = "new-row${newRows}-name" class="table-cell" onfocus = "window.getSelection().selectAllChildren(event.target)" onblur="newcellchange()" contenteditable="plaintext-only">insert name</div></td>
    <td class="table-column"><div id = "new-row${newRows}-lastname" class="table-cell" onfocus = "window.getSelection().selectAllChildren(event.target)" onblur="newcellchange()" contenteditable="plaintext-only">insert lastname</div></td>
    <td class="table-column"><div id = "new-row${newRows}-email" class="table-cell" onfocus = "window.getSelection().selectAllChildren(event.target)" onblur="newcellchange()" contenteditable="plaintext-only">insert email</div></td>
    <td class="table-column"><div id = "new-row${newRows}-password" class="table-cell" onfocus = "window.getSelection().selectAllChildren(event.target)" onblur="newcellchange()" contenteditable="plaintext-only">insert password</div></td>
    <td class="table-column"><div id = "new-row${newRows}-isAdmin" class="table-cell" onfocus = "window.getSelection().selectAllChildren(event.target)" onblur="newcellchange()" contenteditable="plaintext-only">determine if admin</div></td>
    <td class="table-column"><div id = "new-row${newRows}-isActivated" class="table-cell" onfocus = "window.getSelection().selectAllChildren(event.target)" onblur="newcellchange()" >will be set when activating</div></td>
    <td class="table-column"><div id = "new-row${newRows}-registrationDate" class="table-cell" >will be set automatically</div></td>
    <td class="table-column"><div id = "new-row${newRows}-accessLevel" class="table-cell" onfocus = "window.getSelection().selectAllChildren(event.target)" onblur="newcellchange()" contenteditable="plaintext-only">accesslevel</div></td>`;
    userTable.appendChild(newRow);    
    newRows +=1;
}

function newcellchange(){

    
    indexOfNewRow = parseInt(this.event.target.id.split('-')[1].substr(3));
    typeOfNewCell = this.event.target.id.split('-')[2].trim();
    newModifiedCellVal=this.event.target.innerText.trim();
    newModifiedCellVal=newModifiedCellVal.split(" ").join("");
    this.event.target.innerText=newModifiedCellVal;

    
    indexInArray = 0;
    
    rowExists = false;
    tableDataAdded.forEach((newObj, indexNew)=>{
        if (newObj.id == indexOfNewRow) {
            rowExists = true;
            indexInArray = indexNew;
            
        }
        
    });
    
    if (!rowExists){
        tableDataAdded.push({id: indexOfNewRow,
            [typeOfNewCell]: newModifiedCellVal
            });
    }
    
    if (rowExists) {
        tableDataAdded[indexInArray][typeOfNewCell] = newModifiedCellVal;
        
    }
    confirmchange();
    console.log(tableDataAdded)
}

function deleterow(){
    deleteInbox = document.getElementById("id-to-delete");
    isAlreadyDeleted = false;
    idExists = false;
    tableData.forEach((eachUser)=>{
        if(eachUser.id == deleteInbox.value){
            idExists=true;

        }
    });
    rowsToDelete.forEach((userDelete)=>{
        if(userDelete == deleteInbox.value){
            isAlreadyDeleted = true;
        }
    });
    
    
    if (!isAlreadyDeleted && idExists){
        rowsToDelete.push(deleteInbox.value);
    
    deleteList = document.getElementById('to-delete');
    deleteList.innerHTML = "";
    rowsToDelete.forEach((idToDelete)=>{
        newDeleteEl = document.createElement('div');
        
        newDeleteEl.innerHTML =`<div>${idToDelete}
        <input type="button" value = "X" onclick='this.parentElement.style.display = "none";
        
        toFind = this.parentElement.innerText;
        theFind = rowsToDelete.findIndex(function(current){
            
            
            if(current.trim() == toFind.trim()){
                
                return true;
            }else{return false;}
        });
        rowsToDelete.splice(theFind, 1);
        confirmchange();
        '>
        </div>
        `;

        deleteList.appendChild(newDeleteEl);
    });
    document.getElementById("id-to-delete").value = "";
      
    }
    console.log(rowsToDelete)  
    
    document.getElementById("id-to-delete").value = "";
      
    confirmchange();
}

function confirmchange(){
    

    
    var str = "";

    if(tableDataModified.length){
        str = "Modified Users Are:==>\n";
        tableDataModified.forEach((userObj, index)=>{
            
            Object.entries(userObj).forEach((userData, i)=>{
                str += `-   ${userData[0]}: ${userData[1]}\n`;
                
            });
            str+="\n"
        });    
        
    }

    if(tableDataAdded.length){
        str+= "\nAdded Users Are:==>\n";
        tableDataAdded.forEach((userObj, index)=>{
            
            Object.entries(userObj).forEach((userData, i)=>{
                str += `-   ${userData[0]}: ${userData[1]}\n`;
                
            });
            str+="\n"
        });
    }

    if(rowsToDelete.length){
        str+="\nThe ids of the users to be deleted:==>\n";
        rowsToDelete.forEach((userId, index)=>{
            str+=`${userId}\n`;
        });
    }
    document.getElementById('changes-to-show-text').innerText=str;

}