var isClicked = false;

const usernameField = document.getElementById("usernamefield");
usernameField.addEventListener('focus', focusInput);





function focusInput(event){
    if (!isClicked) {
        this.value = "";
        isClicked = true;
    } else {
        this.select();
    };
}