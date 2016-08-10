import Ember from 'ember';
import permissions from 'ember-osf/const/permissions';
import CpPanelBodyComponent from 'ember-collapsible-panel/components/cp-panel-body';
import PreprintFormFieldMixin from '../mixins/preprint-form-field';

export default CpPanelBodyComponent.extend(PreprintFormFieldMixin, {
    READ: permissions.READ,
    WRITE: permissions.WRITE,
    ADMIN: permissions.ADMIN,
    valid: Ember.computed.alias('newContributorId'),
    permissionToggle: false,
    bibliographicToggle: false,
    removalToggle: false,
    stillAdmin: Ember.computed('isAdmin', function() {
        return this.get('isAdmin');
    }),
    addState: 'emptyView', // There are 3 view states on left side of Authors panel. Default state just shows search bar.
    query: null,
    // Total contributor search results
    totalSearchResults: Ember.computed('searchResults.[]', function() {
        let searchResults = this.get('searchResults');
        if (searchResults && searchResults.links) {
            return searchResults.meta.pagination.total;
        } else {
            return;
        }
    }),
    // Total pages of contributor search results
    pages: Ember.computed('searchResults.[]', function() {
        let searchResults = this.get('searchResults');
        if (searchResults && searchResults.links) {
            return searchResults.meta.total;
        } else {
            return;
        }
    }),
    // Search results excluding users that are already contributors
    newSearchResults: Ember.computed('searchResults.[]', 'contributors.[]', 'addState', function() {
        let searchResults = this.get('searchResults');
        let contributors = this.get('contributors');
        let userIds = contributors.map((contrib) => contrib.get('userId'));
        return searchResults.filter((result) => !userIds.contains(result.id));
    }),
    actions: {
        // Adds contributor then redraws view - addition of contributor may change which update/remove contributor requests are permitted
        addContributor(user) {
            // this.sendAction('addContributor', user.id, 'write', true);
            this.attrs.addContributor(user.id, 'write', true).then(res => {
                this.redrawTemplate();
            }, function(reason) {
                console.log(reason);
            });
        },
        // Adds unregistered contributor, then clears form and switches back to search view.
        // Should wait to transition until request has completed.
        addUnregisteredContributor(fullName, email) {
            let res = this.attrs.addUnregisteredContributor(fullName, email, 'write', true);
            res.then(() => {
                this.redrawTemplate();
                this.set('addState', 'searchView');
                this.set('fullName', '');
                this.set('email', '');
            }, function(reason) {
                console.log(reason.errors[0].detail);
            });

        },
        updateQuery(value) {
            this.set('query', value);
        },
        // Requests a particular page of user results
        findContributors(page) {
            var query = this.get('query');
            if (query) {
                this.attrs.findContributors(query, page).then(() => {
                    this.set('addState', 'searchView');
                }, function(reason) {
                    console.log(reason.errors[0].detail);
                });
            }
        },
        // Removes contributor then redraws contributor list view - removal of contributor may change
        // which additional update/remove requests are permitted.
        removeContributor(contrib) {
            this.attrs.removeContributor(contrib).then(() => {
                this.redrawTemplate();
                this.removedSelfAsAdmin(contrib, contrib.get('permission'));
                this.get('contributors').removeObject(contrib);
            });
        },
        // Updates contributor then redraws contributor list view - updating contributor
        // permissions may change which additional update/remove requests are permitted.
        updatePermissions(contributor, permission) {
            let permissionChanges = { [contributor.id]: permission.toLowerCase() };
            this.attrs.editContributors(this.get('contributors'), permissionChanges, {}).then(() => {
                this.redrawTemplate();
                this.removedSelfAsAdmin(contributor, permission);
            });
        },
        // Updates contributor then redraws contributor list view - updating contributor
        // bibliographic info may change which additional update/remove requests are permitted.
        updateBibliographic(contributor, isBibliographic) {
            let bibliographicChanges = { [contributor.id]: isBibliographic };
            this.attrs.editContributors(this.get('contributors'), {}, bibliographicChanges).then(() => {
                this.redrawTemplate();
            });
        },
        // There are 3 view states on left side of Authors panel.  This switches to add unregistered contrib view.
        unregisteredView() {
            this.set('addState', 'unregisteredView');
        },
        // There are 3 view states on left side of Authors panel.  This switches to searching contributor results view.
        searchView() {
            this.set('addState', 'searchView');
            this.set('fullName', '');
            this.set('email', '');
        },
        // There are 3 view states on left side of Authors panel.  This switches to empty view and clears search results.
        emptyView() {
            this.set('addState', 'emptyView');
            this.set('searchQuery', '');
            Ember.$('.searchQuery')[0].value = '';
        },
        // TODO Add server request when API functionality in place.
        reorderItems(itemModels, draggedModel) {
            this.set('contributors', itemModels);
        }
    },
    // Temporary popover content for authors page. Will need to find alternative to jquery selectors.
    didInsertElement: function() {
        Ember.$('#permissions-popover').popover({
            content: '<dl>' +
                '<dt>Read</dt>' +
                    '<dd><ul><li>View preprint</li></ul></dd>' +
                '<dt>Read + Write</dt>' +
                    '<dd><ul><li>Read privileges</li> ' +
                        '<li>Add and configure preprint</li> ' +
                        '<li>Add and edit content</li></ul></dd>' +
                '<dt>Administrator</dt><dd><ul>' +
                    '<li>Read and write privileges</li>' +
                    '<li>Manage authors</li>' +
                    '<li>Public-private settings</li></ul></dd>' +
                '</dl>'
        });
        Ember.$('#bibliographic-popover').popover({
            content: 'Only checked authors will be included in preprint citations. ' +
            'Authors not in the citation can read and modify the preprint as normal.'
        });
        Ember.$('#author-popover').popover({
            content: 'Preprints must have at least one registered administrator and one author showing in the citation at all times.  ' +
            'A registered administrator is a user who has both confirmed their account and has administrator privileges.'
        });
    },
    /**
    * If user removes their own admin permissions, many things on the page must become
    * disabled.  Changing the stillAdmin flag to false will remove many of the options
    * on the page.
    */
    removedSelfAsAdmin(contributor, permission) {
        if (this.get('currentUser').id === contributor.get('userId') && permission !== 'ADMIN') {
            this.set('stillAdmin', false);
        }
    },
    redrawTemplate() {
        this.toggleProperty('removalToggle');
        this.toggleProperty('permissionToggle');
        this.toggleProperty('bibliographicToggle');
    }
});
