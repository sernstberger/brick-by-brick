import {test} from 'node:test';
import assert from 'node:assert/strict';
import {stepIndexFromSearch} from '../src/navigation.js';
test('URL step parsing clamps ranges and rejects malformed values',()=>{
 for(const [search,expected] of [['',0],['?step=9',8],['?step=0',0],['?step=99',12],['?step=-2',0],['?step=1.5',0],['?step=no',0]])assert.equal(stepIndexFromSearch(search,13),expected);
});
