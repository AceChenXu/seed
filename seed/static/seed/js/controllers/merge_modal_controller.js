/**
 * :copyright (c) 2014 - 2017, The Regents of the University of California, through Lawrence Berkeley National Laboratory (subject to receipt of any required approvals from the U.S. Department of Energy) and contributors. All rights reserved.
 * :author
 */
angular.module('BE.seed.controller.merge_modal', [])
  .controller('merge_modal_controller', [
    '$scope',
    '$uibModalInstance',
    'uiGridConstants',
    'naturalSort',
    'columns',
    'data',
    'inventory_type',
    function ($scope, $uibModalInstance, uiGridConstants, naturalSort, columns, data, inventory_type) {
      $scope.inventory_type = inventory_type;
      $scope.data = data;
      $scope.result = [{}];

      var notEmpty = function (input) {
        return !_.isNil(input) && input !== '';
      };

      var updateResult = function () {
        var cleanedData = _.map($scope.data, function (datum) {
          return _.pickBy(datum, notEmpty);
        });
        $scope.result[0] = _.defaults.apply(null, cleanedData);

        if (_.find(columns, {name: 'jurisdiction_tax_lot_id', table: 'TaxLotState'})) {
          var values = [];
          _.forEach(cleanedData, function (datum) {
            values = values.concat(_.split(datum.jurisdiction_tax_lot_id, '; '));
          });
          var cleanedValues = _.uniq(_.without(values, undefined, null, ''));
          $scope.result[0].jurisdiction_tax_lot_id = _.join(cleanedValues.sort(naturalSort), '; ');
        }
      };
      updateResult();

      var reverseOrder = function () {
        $scope.data.reverse();
        updateResult();
      };

      $scope.resultingGridOptions = {
        data: 'result',
        enableColumnMenus: false,
        enableGridMenu: false,
        enableSorting: false,
        enableVerticalScrollbar: uiGridConstants.scrollbars.NEVER,
        flatEntityAccess: true,
        minRowsToShow: 1,
        columnDefs: columns
      };

      $scope.gridOptions = {
        data: 'data',
        enableColumnMenus: false,
        enableGridMenu: true,
        enableSorting: false,
        flatEntityAccess: true,
        gridMenuCustomItems: [{
          title: 'Reverse order',
          action: reverseOrder
        }],
        gridMenuShowHideColumns: false,
        rowTemplate: '<div grid="grid" class="ui-grid-draggable-row" draggable="true"><div ng-repeat="(colRenderIndex, col) in colContainer.renderedColumns track by col.colDef.name" class="ui-grid-cell" ng-class="{ \'ui-grid-row-header-cell\': col.isRowHeader, \'custom\': true }" ui-grid-cell></div></div>',
        columnDefs: columns,
        onRegisterApi: function (gridApi) {
          $scope.gridApi = gridApi;

          gridApi.draggableRows.on.rowDropped($scope, updateResult);
        }
      };
      if (data.length < 10) $scope.gridOptions.minRowsToShow = data.length;

      $scope.close = function () {
        // Merge Records

        $uibModalInstance.close();
      };

      $scope.cancel = function () {
        $uibModalInstance.dismiss();
      };
    }]);
