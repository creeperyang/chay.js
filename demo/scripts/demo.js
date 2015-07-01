var context = {
    newTodo: "",
    todos: [{
        title: 'first',
        done: true
    }, {
        title: 'second',
        done: false
    }],
    add: function() {
        this.todos.push({
            title: this.newTodo,
            done: false
        });
        this.newTodo = '';
    },
    remove: function(item) {
        this.todos.splice(this.todos.indexOf(item), 1);
    }
};

$compile(document.getElementById('demo'), context);
