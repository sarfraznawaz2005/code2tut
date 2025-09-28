const { Flow } = require('pocketflow');
const { FetchLocalNode, IdentifyAbstractionsNode, AnalyzeRelationshipsNode, OrderChaptersNode, WriteChaptersNode, CombineTutorialNode } = require('./nodes');
const { NODE_MAX_RETRIES, NODE_WAIT_TIME } = require('./constants');

function createTutorialFlow(shared) {
  // Instantiate nodes with configurable retry values
  const maxRetries = shared?.retry?.attempts || NODE_MAX_RETRIES;
  const waitTime = NODE_WAIT_TIME;

  const fetchLocal = new FetchLocalNode();
  const identifyAbstractions = new IdentifyAbstractionsNode(maxRetries, waitTime);
  const analyzeRelationships = new AnalyzeRelationshipsNode(maxRetries, waitTime);
  const orderChapters = new OrderChaptersNode(maxRetries, waitTime);
  const writeChapters = new WriteChaptersNode(maxRetries, waitTime);
  const combineTutorial = new CombineTutorialNode();

  // Connect nodes in sequence based on the design
  fetchLocal.next(identifyAbstractions);
  identifyAbstractions.next(analyzeRelationships);
  analyzeRelationships.next(orderChapters);
  orderChapters.next(writeChapters);
  writeChapters.next(combineTutorial);

  // Create the flow starting with FetchLocalNode
  const tutorialFlow = new Flow(fetchLocal);

  return tutorialFlow;
}

module.exports = createTutorialFlow;