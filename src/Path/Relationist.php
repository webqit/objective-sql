<?php
namespace Rays\Framework\Database\Query\Relationship;

use Exception;
use Rays\Kernel\Utils\Str;
use Rays\Framework\Database\Query\Interfaces\QueryInterface;
use Rays\Framework\Database\Query\Relationship\RelationistParam;
use Rays\Framework\Database\Query\Relationship\Lexer;
use Rays\Framework\Database\Blueprint\Blueprint;
use Rays\Kernel\Interpreter\Expression;

class Relationist {

	/**
	 * @var QueryInterface
	 */
	protected $baseTable;

	/**
	 * @var string
	 */
	protected $relationshipPath;
	
	/**
	 * @var RelationistParam
	 */
	protected $immediateTarget;
	
	/**
	 * @var RelationistParam
	 */
	protected $initiator;
	
	/**
	 * @var RelationistParam
	 */
	protected $finalTarget;
	
	/**
	 * @var bool
	 */
	protected $autoPrefixed = false;
	
	/**
	 * The constructor.
	 * Sets the initiating model in the relationship.
	 *
	 * @param OperandInterface 	$baseTable
	 * @param string 			$relationshipPath
	 *
	 * @return array
	 */
	public function __construct(string $baseTable, string $relationshipPath) {
		$this->baseTable = $baseTable;
		// If path is like: path1->path2, then everything is steming from the current query
		if (!Lexer::isIncomingReference($relationshipPath) && $this->baseTable) {
			$this->autoPrefixed = true;
			$relationshipPath = $this->baseTable.'->'.$relationshipPath;
		}
		$this->relationshipPath = $relationshipPath;
	}
	
	/**
	 * Makes an object of table properties.
	 *
	 * @param string 	$tableName
	 * @param array 	$prePostTarget
	 *
	 * @return RelationistParam
	 */
	protected function makeRelationistParam(string $tableName, array $prePostTarget) {
		$relationistParam = new RelationistParam;
		$relationistParam->tableName = $tableName;
		$relationistParam->blueprint = Blueprint::instance($tableName);
		$relationistParam->primaryKey = $relationistParam->blueprint()->conventions->primaryKey;
		$relationistParam->actingKey = $relationistParam->primaryKey;
		$relationistParam->originalPath = $this->autoPrefixed ? Str::after('->', $this->relationshipPath) : $this->relationshipPath;
		$relationistParam->preTarget = $this->autoPrefixed ? Str::after('->', $prePostTarget[0]) : $prePostTarget[0];
		$relationistParam->postTarget = $prePostTarget[1];
		return $relationistParam;
	}
	
	/**
	 * Returns the target table in the chain.
	 *
	 * @param string 	$relationshipPath
	 * @param bool	 	$firstIsTarget
	 *
	 * @return QueryInterface
	 */
	protected function getTarget(string $relationshipPath, bool $firstIsTarget = false) {
		// Save original
		$_relationshipPath = $relationshipPath;
		$inReverse = false;
		if ($firstIsTarget) {
			if (Lexer::isIncomingReference($relationshipPath)) {
				// The strategy is to reverse the string...
				// advance forward... which is really backwards...
				// then reverse outputs
				$relationshipPath = Lexer::reverseReference($relationshipPath);
				$firstIsTarget = false;
				$inReverse = true;
			}
		}
		// Imagine a path: seg1<-seg2<-seg3<-seg4->[6-45]->seg5->seg6->seg7<-seg8<-seg9<-seg10->seg11->seg12->seg13
		// seg4 happens to be the first table mention and seg10 is last table mention.
		$anchorTable_start = Str::contains('<-', $relationshipPath) ? Str::afterLast('<-', $relationshipPath) : $relationshipPath;
		$preAnchorTable = Str::contains('<-', $relationshipPath) ? Str::beforeLast('<-', $relationshipPath) : '';
		$postAnchorTable = Str::after('->', $anchorTable_start);
		$anchorTable = Str::before('->', $anchorTable_start);
		$anchorTable_path_split = $postAnchorTable ? explode('->', $postAnchorTable) : [];
		// Pre/Post anchor string...
		$prePostAnchorTable = $inReverse
			? [Lexer::reverseReference($postAnchorTable), Lexer::reverseReference($preAnchorTable)] 
			: [$preAnchorTable, $postAnchorTable];
		// Just before the new one found
		$previousTableRelationistParam = null;
		// We start from the anchor - the anchor
		$anchorTableRelationistParam = $this->makeRelationistParam($anchorTable, $prePostAnchorTable);
		foreach($anchorTable_path_split as $i => $key) {
			$fieldDef = $anchorTableRelationistParam->blueprint()->fields->{$key};
			if (!($fieldDef && $fieldDef->referencedEntity) && $i === count($anchorTable_path_split) - 1) {
				// $key must be a leaf column name... not an actingKey.
				$anchorTableRelationistParam->leaf = $key;
				continue;
			}
			// Notice the " + 1"... first key is at zero index.
			$progress = array_slice($anchorTable_path_split, 0, $i + 1);
			$unknown = array_slice($anchorTable_path_split, $i + 1);
			$preTarget = ($preAnchorTable ? $preAnchorTable.'<-' : '').implode('->', array_merge([$anchorTable], $progress));
			$postTarget = implode('->', $unknown);
			// Pre/Post target string...
			$prePostTarget = $inReverse 
				? [Lexer::reverseReference($postTarget), Lexer::reverseReference($preTarget)] 
				: [$preTarget, $postTarget];
			if ($fieldDef && ($foreignKeyParams = $fieldDef->referencedEntity)) {
				// Now we know the actingKey
				$anchorTableRelationistParam->actingKey = $key;
				// Before we publish this as anchorTable, let's record the current as the immediate...
				$previousTableRelationistParam = clone $anchorTableRelationistParam;
				// The information known as at now.
				$anchorTableRelationistParam = $this->makeRelationistParam($foreignKeyParams->table, $prePostTarget);
				// Strategy2
				if ($firstIsTarget) {
					// Notice the order!
					return [$previousTableRelationistParam, $anchorTableRelationistParam];
				}
				continue;
			}
			throw new Exception('We couldn\'t connect "'.$prePostTarget[0].'" and "'.$prePostTarget[1].'" in the relationship "'.$_relationshipPath/*original*/.'".');
		}
		// Normal order!
		return [$anchorTableRelationistParam, $previousTableRelationistParam];
	}
	
	/**
	 * Returns the first table stop in the chain.
	 *
	 * @return RelationistParam
	 */
	public function getImmediateTarget() {
		if (!$this->immediateTarget) {
			$search = $this->getTarget($this->relationshipPath, true/*firstIsTarget*/);
			$this->initiator = $search[0];
			$this->immediateTarget = $search[1];
			// -----------------------------
			if ($this->initiator->tableName && $this->initiator->tableName !== $this->baseTable) {
				throw new Exception('We couldn\'t relate table "'.$this->baseTable.'" with "'.$this->relationshipPath.'".');
			}
		}
		return $this->immediateTarget;
	}
	
	/**
	 * Returns the initiator params.
	 *
	 * @return RelationistParam
	 */
	public function getInitiator() {
		if (!$this->initiator) {
			$this->getImmediateTarget();
		}
		return $this->initiator;
	}
	
	/**
	 * Returns the last table stop in the chain.
	 *
	 * @return RelationistParam
	 */
	public function getFinalTarget() {
		if (!$this->finalTarget && ($search = $this->getTarget($this->relationshipPath))) {
			$this->finalTarget = $search[0];
			// -----------------------------
			// For Incoming references, the path FROM target is the actual actingKey in the relationship
			// Note that we're using the full $this->relationshipPath and not simply $this->finalTarget->preTarget
			// as $this->finalTarget->preTarget maybe only a single word sometimes (without directional information),
			// in both cases of incoming or outgoing references
			if (Lexer::isIncomingReference($this->relationshipPath)) {
				$this->finalTarget->actingKey = Lexer::reverseReference($this->finalTarget->preTarget);
			}
		}
		return $this->finalTarget;
	}
}