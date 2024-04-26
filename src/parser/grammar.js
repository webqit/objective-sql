
// Statements
import CreateTable from './create/CreateTable.js';
import CreateDatabase from './create/CreateDatabase.js';
import AlterTable from './alter/AlterTable.js';
import AlterDatabase from './alter/AlterDatabase.js';
import DropTable from './drop/DropTable.js';
import DropDatabase from './drop/DropDatabase.js';
import Delete from './delete/Delete.js';
import Insert from './insert/Insert.js';
import Select from './select/Select.js';
//import Union from './select/Union.js';
import Update from './update/Update.js';
// Expressions
import Identifier from './Identifier.js';
import CaseConstruct from './select/case/CaseConstruct.js';
import Abstraction from './select/Abstraction.js';
import Assertion from './select/Assertion.js';
import Math from './select/Math.js';
import Aggr from './select/Aggr.js';
import Func from './select/Func.js';
import Json from './select/Json.js';
import PgConcat from './select/str/PgConcat.js';
import Str from './select/str/Str.js';
import Num from './select/Num.js';

/**
 * @var object
 */
export default {
	// Statements
	//Union,			// ... UNION ...
	Select,				// SELECT ... FROM ...
	Insert,				// INSERT INTO ...
	Update,				// UPDATE ...
	Delete,				// DELETE FROM ...
	CreateDatabase,
	CreateTable,
	AlterDatabase,
	AlterTable,
	DropDatabase,
	DropTable,
	// Expressions
	Abstraction,
	CaseConstruct,
	PgConcat,
	Assertion,
	Math,
	Aggr,
	Func,
	Str,
	Num,
	Json,
	Identifier,
}