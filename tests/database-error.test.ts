import {test} from 'node:test';
import assert from 'node:assert/strict';
import {databaseError} from '../lib/database-error.ts';
test('missing tables and permissions explain setup failure without exposing database details',()=>{
 for(const code of ['PGRST205','42P01','PGRST202']){const error=databaseError({code},'Unavailable');assert.equal(error.status,503);assert.match(error.message,/setup is incomplete/);}
 assert.match(databaseError({code:'42501'},'Unavailable').message,/permissions/);
 assert.match(databaseError({code:'42703'},'Unavailable').message,/out of date/);
 assert.equal(databaseError({code:'unknown'},'Unavailable').message,'Unavailable');
});
