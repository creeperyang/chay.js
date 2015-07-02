var context = {
    newTodo: "",
    todos: [{
        title: 'Meeting at 14:00',
        done: true
    }, {
        title: 'Have dinner with Kate',
        done: false
    }],
    add: function() {
        this.todos.push({
            title: this.newTodo,
            done: false
        });
        this.newTodo = '';
    },
    remove: function(item, ev) {
        console.log(ev)
        this.todos.splice(this.todos.indexOf(item), 1);
    }
};

$compile(document.getElementById('demo'), context);
