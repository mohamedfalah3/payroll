const Base = require('./base');

class Hawala extends Base {
    constructor(hawalaData) {
        super();
        this.id = hawalaData.id || this.generateId();
        this.name = hawalaData.name;
        this.location = hawalaData.location;
        this.description = hawalaData.description;
    }

    static getFilePath() {
        return './data/hawalas.json';
    }

    validate() {
        if (!this.name || typeof this.name !== 'string') {
            throw new Error('Hawala name is required and must be a string');
        }
        if (!this.location || typeof this.location !== 'string') {
            throw new Error('Hawala location is required and must be a string');
        }
        if (this.description && typeof this.description !== 'string') {
            throw new Error('Hawala description must be a string if provided');
        }
    }
}

module.exports = Hawala;