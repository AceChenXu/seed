/*
 * :copyright (c) 2014 - 2016, The Regents of the University of California, through Lawrence Berkeley National Laboratory (subject to receipt of any required approvals from the U.S. Department of Energy) and contributors. All rights reserved.
 * :author
 */
angular.module('BE.seed.controller.inventory_list', [])
  .controller('inventory_list_controller', [
    '$scope',
    '$window',
    '$log',
    '$uibModal',
    '$stateParams',
    'inventory_service',
    'label_service',
    'inventory',
    'cycles',
    'columns',
    'urls',
    function ($scope,
              $window,
              $log,
              $uibModal,
              $stateParams,
              inventory_service,
              label_service,
              inventory,
              cycles,
              columns,
              urls) {
      $scope.inventory_type = $stateParams.inventory_type;
      $scope.objects = inventory.results;
      $scope.pagination = inventory.pagination;
      $scope.total = $scope.pagination.total;
      $scope.number_per_page = 999999999;

      $scope.labels = [];
      $scope.selected_labels = [];

      var localColumns = localStorage.getItem('grid.' + $scope.inventory_type + '.visible');
      if (!_.isNull(localColumns)) {
        $scope.visible_columns = JSON.parse(localColumns);
      } else {
        $scope.visible_columns = [];
      }

      // Matching dropdown values
      var SHOW_ALL = 'Show All';
      var SHOW_MATCHED = 'Show Matched';
      var SHOW_UNMATCHED = 'Show Unmatched';

      $scope.clear_labels = function () {
        $scope.selected_labels = [];
      };

      $scope.update_show_matching_filter = function (optionValue) {
        switch (optionValue) {
          case SHOW_ALL:
            $scope.search.filter_params.parents__isnull = undefined;
            break;
          case SHOW_MATCHED:
            $scope.search.filter_params.parents__isnull = false;  //has parents therefore is matched
            break;
          case SHOW_UNMATCHED:
            $scope.search.filter_params.parents__isnull = true;   //does not have parents therefore is unmatched
            break;
          default:
            $log.error('#matching_controller: unexpected filter value: ', optionValue);
            return;
        }
        //$scope.do_update_buildings_filters();
      };

      $scope.loadLabelsForFilter = function (query) {
        console.debug('loadLabelsForFilter query:', query);
        return _.filter($scope.labels, function (lbl) {
          if (_.isEmpty(query)) {
            // Empty query so return the whole list.
            return true;
          } else {
            // Only include element if it's name contains the query string.
            return _.includes(_.toLower(lbl.name), _.toLower(query));
          }
        });
      };

      $scope.$watchCollection('selected_labels', function () {
        // Only submit the `id` of the label to the API.
        console.debug('selected_labels:', $scope.selected_labels);
        // if ($scope.selected_labels.length) {
        //   $scope.search.filter_params.canonical_building__labels = _.map($scope.selected_labels, 'id');
        // } else {
        //   delete $scope.search.filter_params.canonical_building__labels;
        // }
        _.delay($scope.updateHeight, 150);
      });

      /**
       Opens the update building labels modal.
       All further actions for labels happen with that modal and its related controller,
       including creating a new label or applying to/removing from a building.
       When the modal is closed, and refresh labels.
       */
      $scope.open_update_labels_modal = function () {

        var modalInstance = $uibModal.open({
          templateUrl: urls.static_url + 'seed/partials/update_item_labels_modal.html',
          controller: 'update_item_labels_modal_controller',
          resolve: {
            inventory_ids: function () {
              if ($scope.gridApi.selection.getSelectAllState()) return [];
              return _.map($scope.gridApi.selection.getSelectedRows(), 'id');
            },
            inventory_type: function () {
              return $scope.inventory_type;
            }
          }
        });
        modalInstance.result.then(function () {
          //dialog was closed with 'Done' button.
          get_labels();
          //refresh_search();
        });
      };

      var init_matching_dropdown = function () {
        $scope.matching_filter_options = [
          {id: SHOW_ALL, value: SHOW_ALL},
          {id: SHOW_MATCHED, value: SHOW_MATCHED},
          {id: SHOW_UNMATCHED, value: SHOW_UNMATCHED}
        ];
        $scope.matching_filter_options_init = SHOW_ALL;
      };


      var lastCycleId = inventory_service.get_last_cycle();
      $scope.cycle = {
        selected_cycle: lastCycleId ? _.find(cycles.cycles, {id: lastCycleId}) : cycles.cycles[0],
        cycles: cycles.cycles
      };

      var processData = function () {
        var data = angular.copy($scope.objects);
        var roots = data.length;
        for (var i = 0, trueIndex = 0; i < roots; ++i) {
          data[trueIndex].$$treeLevel = 0;
          var related = data[trueIndex].related;
          var relatedIndex = trueIndex;
          for (var j = 0; j < related.length; ++j) {
            // Rename nested keys
            if ($scope.inventory_type == 'properties') {
              var map = {
                city: 'tax_city',
                state: 'tax_state',
                postal_code: 'tax_postal_code'
              };
            } else if ($scope.inventory_type == 'taxlots') {
              var map = {
                city: 'property_city',
                state: 'property_state',
                postal_code: 'property_postal_code'
              };
            }
            var updated = _.reduce(related[j], function (result, value, key) {
              key = map[key] || key;
              result[key] = value;
              return result;
            }, {});

            data.splice(++trueIndex, 0, updated);
          }
          // Remove unnecessary data
          delete data[relatedIndex].related;
          ++trueIndex;
        }
        $scope.data = data;
      };

      var refresh_objects = function () {
        if ($scope.inventory_type == 'properties') {
          inventory_service.get_properties($scope.pagination.page, $scope.number_per_page, $scope.cycle.selected_cycle).then(function (properties) {
            $scope.objects = properties.results;
            $scope.pagination = properties.pagination;
            processData();
          });
        } else if ($scope.inventory_type == 'taxlots') {
          inventory_service.get_taxlots($scope.pagination.page, $scope.number_per_page, $scope.cycle.selected_cycle).then(function (taxlots) {
            $scope.objects = taxlots.results;
            $scope.pagination = taxlots.pagination;
            processData();
          });
        }
      };

      $scope.update_cycle = function (cycle) {
        inventory_service.save_last_cycle(cycle.id);
        $scope.cycle.selected_cycle = cycle;
        refresh_objects();
      };

      processData();

      var get_labels = function () {
        label_service.get_labels().then(function (data) {
          $scope.labels = data.results;
          console.debug(data.results);
        });
      };

      $scope.open_delete_modal = function () {
        var modalInstance = $uibModal.open({
          templateUrl: urls.static_url + 'seed/partials/delete_modal.html',
          controller: 'delete_modal_controller',
          resolve: {
            search: function () {
              return $scope.search;
            }
          }
        });

        modalInstance.result.then(function () {
          // TODO
        }, function (message) {
          // TODO
        });
      };

      get_labels();
      init_matching_dropdown();

      var defaults = {
        minWidth: 75,
        width: 150
        //type: 'string'
      };
      _.map(columns, function (col) {
        var filter = {}, aggregation = {};
        if (!_.isEmpty($scope.visible_columns)) col.visible = _.includes($scope.visible_columns, col.name);
        if (col.type == 'number') filter = {filter: inventory_service.numFilter()};
        else filter = {filter: inventory_service.textFilter()};
        if (col.related) aggregation.treeAggregationType = 'uniqueList';
        return _.defaults(col, filter, aggregation, defaults);
      });
      columns = inventory_service.reorderBySelected(columns, $scope.visible_columns);
      columns.unshift({
        name: 'id',
        displayName: '',
        cellTemplate: '<div class="ui-grid-row-header-link">' +
        '  <a class="ui-grid-cell-contents" ng-if="row.entity.$$treeLevel === 0" ng-href="#/{$grid.appScope.inventory_type == \'properties\' ? \'properties\' : \'taxlots\'$}/{$COL_FIELD$}/cycles/{$grid.appScope.cycle.selected_cycle.id$}">' +
        '    <i class="ui-grid-icon-info-circled"></i>' +
        '  </a>' +
        '  <a class="ui-grid-cell-contents" ng-if="!row.entity.hasOwnProperty($$treeLevel)" ng-href="#/{$grid.appScope.inventory_type == \'properties\' ? \'taxlots\' : \'properties\'$}/{$COL_FIELD$}/cycles/{$grid.appScope.cycle.selected_cycle.id$}">' +
        '    <i class="ui-grid-icon-info-circled"></i>' +
        '  </a>' +
        '</div>',
        enableColumnMenu: false,
        enableColumnResizing: false,
        enableFiltering: false,
        enableHiding: false,
        enableSorting: false,
        exporterSuppressExport: true,
        pinnedLeft: true,
        width: 30
      });

      $scope.updateHeight = function () {
        var height = 0;
        _.forEach(['.header', '.page_header_container', '.section_nav_container', '.inventory-list-controls', '.inventory-list-tab-container'], function (selector) {
          height += angular.element(selector)[0].offsetHeight;
        });
        angular.element('#grid-container').css('height', 'calc(100vh - ' + (height + 2) + 'px)');
        angular.element('#grid-container > div').css('height', 'calc(100vh - ' + (height + 4) + 'px)');
        $scope.gridApi.core.handleWindowResize();
      };

      $scope.open_export_modal = function () {
        var modalInstance = $uibModal.open({
          templateUrl: urls.static_url + 'seed/partials/export_inventory_modal.html',
          controller: 'export_inventory_modal_controller',
          resolve: {
            gridApi: function () {
              return $scope.gridApi;
            }
          }
        });

        modalInstance.result.then(function () {
        }, function (message) {
          console.info(message);
          console.info('Modal dismissed at: ' + new Date());
        });
      };

      var savePinning = function () {
        /*if (!$scope.restoring) {
         localStorage.setItem('grid.properties', JSON.stringify($scope.gridApi.saveState.save()));
         }*/
      };

      $scope.gridOptions = {
        data: 'data',
        enableFiltering: true,
        enableGridMenu: true,
        enableSorting: true,
        exporterCsvFilename: window.BE.initial_org_name + ($scope.inventory_type == 'taxlots' ? ' Tax Lot ' : ' Property ') + 'Data.csv',
        exporterMenuPdf: false,
        fastWatch: true,
        flatEntityAccess: true,
        gridMenuShowHideColumns: false,
        saveFocus: false,
        saveGrouping: false,
        saveGroupingExpandedStates: false,
        saveScroll: false,
        saveSelection: false,
        saveTreeView: false,
        showTreeExpandNoChildren: false,
        columnDefs: columns,
        treeCustomAggregations: inventory_service.aggregations(),
        onRegisterApi: function (gridApi) {
          $scope.gridApi = gridApi;

          _.delay($scope.updateHeight, 150);
          angular.element($window).on('resize', _.debounce($scope.updateHeight, 150));

          gridApi.pinning.on.columnPinned($scope, savePinning);

          gridApi.core.on.rowsRendered($scope, _.debounce(function () {
            $scope.$apply(function () {
              $scope.total = _.filter($scope.gridApi.core.getVisibleRows($scope.gridApi.grid), {treeLevel: 0}).length;
            });
          }, 150));
        }
      }
    }]);