import {test, expect} from '@src/fixtures';
import {expectContract, expectMessage, expectStatus} from '@src/api/assertions';
import {build} from '@src/data/builders';
import {ScheduledEvent, Service, ServicesOverview} from '@src/schemas';

test.describe('Service tracker API', {tag: '@api'}, () => {
    test('creates a service and returns it in the overview', {tag: '@smoke'}, async ({api, seed}) => {
        const input = build.service({cost: 199.99, icon: 'FitnessCenter'});
        const service = await seed.service(input);

        expect(service).toMatchObject({
            name: input.name, count_type: 'negative', cost_type: 'per_session', total_quantity: 10, cost: '199.99', icon: 'FitnessCenter',
        });
        const {services} = expectContract(await api.services.overview(), 200, ServicesOverview);
        expect(services.map(s => s.id)).toContain(service.id);
    });

    for (const field of ['name', 'countType', 'costType', 'cost'] as const) {
        test(`rejects a service without ${field}`, async ({api}) => {
            expectMessage(await api.services.create(build.service({[field]: undefined})), 400, 'Missing required fields');
        });
    }

    test('updates every field of a service', async ({api, seed}) => {
        const service = await seed.service();
        const changes = build.service({countType: 'positive', costType: 'group', totalQuantity: 4, cost: 1000, icon: 'Pool'});

        const updated = expectContract(await api.services.update(service.id, changes), 200, Service);
        expect(updated).toMatchObject({name: changes.name, count_type: 'positive', cost_type: 'group', total_quantity: 4, cost: '1000.00', icon: 'Pool'});
        expect(Date.parse(updated.updated_at)).toBeGreaterThanOrEqual(Date.parse(service.updated_at));
    });

    test('update validates required fields', async ({api, seed}) => {
        const service = await seed.service();
        expectMessage(await api.services.update(service.id, {name: 'only a name'}), 400, 'Missing required fields');
    });

    test('update and delete of a missing service return 404', async ({api}) => {
        expectStatus(await api.services.update(2_000_000_000, build.service()), 404);
        expectStatus(await api.services.remove(2_000_000_000), 404);
    });

    test.describe('scheduled events', () => {
        test('an event is created as upcoming for its service', async ({api, seed}) => {
            const service = await seed.service();
            const event = await seed.event(service.id);

            expect(event).toMatchObject({service_id: service.id, status: 'upcoming'});
            const {events} = expectContract(await api.services.overview(), 200, ServicesOverview);
            expect(events.map(e => e.id)).toContain(event.id);
        });

        test('rescheduling moves the date and keeps the event upcoming', async ({api, seed}) => {
            const event = await seed.event((await seed.service()).id);
            const newDate = new Date(Date.now() + 7 * 86_400_000).toISOString();

            const moved = expectContract(await api.services.updateEvent(event.id, {eventDate: newDate}), 200, ScheduledEvent);
            expect(Date.parse(moved.event_date)).toBe(Date.parse(newDate));
            expect(moved.status).toBe('upcoming');
        });

        test('validates required fields', async ({api}) => {
            expectMessage(await api.services.createEvent({eventDate: new Date().toISOString()}), 400, 'serviceId and eventDate are required');
            expectMessage(await api.services.updateEvent(1, {}), 400, 'eventDate is required');
        });

        test('deleting a service deletes its events', async ({api, seed}) => {
            const service = expectContract(await api.services.create(build.service()), 201, Service);
            const event = await seed.event(service.id);

            expectStatus(await api.services.remove(service.id), 204);
            expectStatus(await api.services.removeEvent(event.id), 404);
        });
    });
});
