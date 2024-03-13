"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Order", "name", {
      type: DataTypes.STRING,
      allowNull: false,
    });
    await queryInterface.addColumn("Order", "image", {
      type: DataTypes.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("Order", "totalPrice", {
      type: DataTypes.BIGINT,
      allowNull: false,
    });
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Order", "name", {
      type: DataTypes.STRING,
      allowNull: false,
    });
    await queryInterface.removeColumn("Order", "image", {
      type: DataTypes.STRING,
      allowNull: true,
    });
    await queryInterface.removeColumn("Order", "totalPrice", {
      type: DataTypes.BIGINT,
      allowNull: false,
    });
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  },
};
