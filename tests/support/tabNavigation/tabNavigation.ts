import Interception from "../../support/interception/interception";

class Navigation {

    private interception: Interception;

    constructor(interception: Interception) {
        this.interception = interception;
    }

    /**
     * @async
     * @function gotoTabRequests
     * @description Navigates to the 'Leave Requests' tab and waits for the initial GET /api/leave response.
     * @returns {Promise<void>}
     */
    async gotoTabRequests(url: string, statusCode: number, selector: string): Promise<this> {
        await this.interception.interceptions([{
            url: url,
            method: 'GET',
            statusCode: statusCode
        }], selector)
        return this;
    }
}

export default Navigation;