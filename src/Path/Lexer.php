<?php
namespace Rays\Framework\Database\Query\Relationship;

use Exception;
use Rays\Kernel\Utils\Str;
use Rays\Kernel\Interpreter\Comparison;

class Lexer {
     
	/**
     * @var array
     */
    protected static $signatures = [];

	/**
	 * @var string
	 */
	protected $inputOperand;
	
	/**
	 * @var string
	 */
	public $finalOperand;
	
	/**
	 * Remove any outer backticks so we can work with plain field names.
	 * (Leave inner backticks as-is... for whetever their purpose.)
	 *
	 * @param string $str
	 *
	 * @retrun string
	 */
	public static function unBacktick($str) {
		return substr($str, 0, 1) === '`' && substr($str, -1) === '`' ? substr($str, 1, -1) : $str;
	}
	
	/**
	 * Tells if a column is a reference.
	 *
	 * @param string $relationshipPath
	 *
	 * @return bool
	 */
	public static function isReference(string $relationshipPath) {
		return Str::contains('<-', $relationshipPath) || Str::contains('->', $relationshipPath) || Str::contains(']', $relationshipPath) || Str::contains('}', $relationshipPath) || (Str::endsWith(')', $relationshipPath) && Str::contains('.', Str::before('(', $relationshipPath)));
	}
	
	/**
	 * Tells if a path is an outgoing reference in direction.
	 *
	 * @param string $relationshipPath
	 *
	 * @return bool
	 */
	public static function isOutgoingReference(string $relationshipPath) {
		return (Str::contains('->', $relationshipPath) && !Str::contains('<-', Str::before('->', $relationshipPath)))  || Str::endsWith(']', $relationshipPath);
	}
	
	/**
	 * Tells if a path is an incoming reference in direction.
	 *
	 * @param string $relationshipPath
	 *
	 * @return bool
	 */
	public static function isIncomingReference(string $relationshipPath) {
		return Str::contains('<-', $relationshipPath) && !Str::contains('->', Str::before('<-', $relationshipPath));
	}
	
	/**
	 * Tells if termination of the path is narrow or broad.
	 *
	 * @param string $relationshipPath
	 *
	 * @return int
	 */
	public static function terminationType(string $relationshipPath) {
		if (Str::endsWith(']', $relationshipPath) || Str::endsWith('}', $relationshipPath) || (Str::endsWith(')', $relationshipPath) && static::isReference($relationshipPath))) {
			return 2;
		}
		if (!Str::contains('->', $relationshipPath) && !Str::contains('<-', $relationshipPath)) {
			return 0;
		}
		return ($leaf = Str::afterLast('->', $relationshipPath)) && !Str::contains('<-', $leaf) ? 1 : 2;
	}
	
	/**
	 * Returns the relationshipPath in reverse direction.
	 *
	 * @param string $relationshipPath
	 *
	 * @return array
	 */
	public static function reverseReference(string $relationshipPath) {
		$originallyBackticked = false;
		if (Str::startsWith('`', $relationshipPath) && Str::endsWith('`', $relationshipPath)) {
			$originallyBackticked = true;
			$relationshipPath = substr($relationshipPath, 1, -1);
		}
		// Reverse arrow directions and at the same time, insert delimiters
		$reversedArrowsAndDelimitedPath = Str::splitOuterInclusive($relationshipPath, ['->', '<-']);
		$reverse = array_reverse(array_map(function($item) {
			return Str::startsWith('->', $item) ? Str::after('->', $item).'<-'
				: (Str::startsWith('<-', $item) ? Str::after('<-', $item).'->'
					: (Str::endsWith('->', $item) ? '<-'.Str::beforeLast('->', $item)
						: (Str::endsWith('<-', $item) ? '->'.Str::beforeLast('<-', $item) : $item)));
		}, $reversedArrowsAndDelimitedPath));
		return $originallyBackticked 
			? '`'.implode('', $reverse).'`' : implode('', $reverse);
	}
	
    /**
     * Compares the give subject/functionsList with previous ones and returns same signature on a match.
     *
     * @param string 	$subject
     * @param array 	$functionsList
     * @param string 	$default
     *
     * @return string
     */
	public static function getSignature(string $subject, array $functionsList, string $default = null) {
		foreach(static::$signatures as $signature => $functions) {
			if (Str::startsWith($subject, $signature) && Comparison::compare($functions, $functionsList)) {
				return $signature;
			}
		}
		$signature = $default ?: preg_replace('/[^A-Za-z0-9_]+/', '_', $subject);
		static::$signatures[$signature] = $functionsList;
		return $signature;
	}

	/**
	 * Checks if the input string is an SQL function and parses its parameters if.
	 *
	 * @param string $str
	 *
	 * @return array
	 */
	public static function matchSqlFunction(string $str) {
		if (Str::endsWith(')', $str) && preg_match('/^[\w]+\(/', $str)) {
			return [Str::before('(', $str), array_map('trim', Str::splitOuter(Str::after('(', Str::beforeLast(')', $str)), ','))];
		}
	}
	
	/**
	 * Parses filters in square brackets that have bee added to a identifyer in a path.
	 *
	 * @param string 	$str
	 * @param bool 		$leafAsBody
	 *
	 * @return array
	 */
	public static function parseQuery(string $str, bool $leafAsBody = false) {
		$subject = $str;
		$functions = [];
		$body = null;
		$bodyTags = null;
		// Parse body
		if ((Str::endsWith(']', $str) && ($bodyTags = '[]')) || (Str::endsWith('}', $str) && ($bodyTags = '{}'))) {
			list($bodyStart, $bodyEnd) = str_split($bodyTags);
			if (Str::contains('.', Str::before($bodyStart, $str))) {
				list($subject, $body) = array_merge(array_map('trim', Str::splitOuter(Str::beforeLast($bodyEnd, $str), [')'.$bodyStart, ') '.$bodyStart])), ['']);
				$subject .= ')';
			} else {
				$subject = Str::before($bodyStart, $str);
				$body = Str::after($bodyStart, Str::beforeLast($bodyEnd, $str));
			}
			$bodySplit = Str::splitOuter($body, ',');
			if ($bodyTags === '[]') {
				$body = array_map('trim', $bodySplit);
			} else {
				$body = [];
				foreach($bodySplit as $splitItem) {
					$keyVal = Str::splitOuter($splitItem, ':');
					$body[trim($keyVal[0])] = trim($keyVal[1]);
				}
			}
		} elseif ($leafAsBody && ($leaf = Str::afterLast('->', $str)) && !Str::contains('<-', $leaf) && !Str::contains(')', $leaf)) {
			$body = [$leaf];
			$subject = Str::beforeLast('->', $str);
		}
		// Parse functions
		if (Str::endsWith(')', $subject)) {
			$table_functions = Str::splitOuter($str, '.');
			$subject = array_shift($table_functions);
			$functions = array_map(function($func) use ($body, $bodyTags) {
				$funcName = Str::before('(', $func);
				if ($body && $bodyTags === '[]' && strtolower($funcName) === 'select') {
					throw new Exception('The "select" function cannot be used in a query with a body!');
				}
				return ['name' => $funcName, 'args' => array_map('trim', Str::splitOuter(Str::after('(', Str::beforeLast(')', $func)), ','))];
			}, $table_functions);
		}		
		return ['query' => $str, 'subject' => $subject, 'functions' => $functions, 'body' => $body];
	}
	
	/**
	 * Constructor
	 *
	 * @param string $operand
	 */
	public function __construct(string $operand) {
		$this->inputOperand = $operand;
		$this->finalOperand = $operand;
	}
	
	/**
	 * Parses the operand and returns the matches.
	 *
	 * @return array
	 */
	public function matches() {
		if (static::isReference($this->inputOperand) && !Str::startsWith('"', $this->inputOperand) && !Str::endsWith('"', $this->inputOperand)) {
			if ($funcMatch = static::matchSqlFunction($this->inputOperand)) {
				list($funcName, $funcParameters) = $funcMatch;
				$collection = [];
				$funcParameters = array_map(function($parameter) use (& $collection) {
					$lexer = new static($parameter);
					$collection = array_merge($collection, $lexer->matches());
					return $lexer->finalOperand;
				}, $funcParameters);
				$this->finalOperand = $funcName.'('.implode(', ', $funcParameters).')';
				return $collection;
			}
			$unBacktickedInput = static::unBacktick($this->inputOperand);
			$this->finalOperand = '`'.$unBacktickedInput.'`';
			return [static::parseQuery($unBacktickedInput)];
		}
		return [];
	}
}