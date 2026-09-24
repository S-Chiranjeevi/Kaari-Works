import 'dart:convert';

import 'package:clerk_auth/clerk_auth.dart' as clerk;
import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:flutter/material.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:http/http.dart' as http;
import 'package:uuid/uuid.dart';

const _green = Color(0xFF13866C);
const _ink = Color(0xFF172B29);
const _paper = Color(0xFFF7F8F5);
const _apiBase = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:3000',
);
const _clerkKey = String.fromEnvironment('CLERK_PUBLISHABLE_KEY');
const _googleWebClientId = String.fromEnvironment('GOOGLE_WEB_CLIENT_ID');

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  if (_clerkKey.isEmpty) {
    runApp(const MissingConfigurationApp());
    return;
  }
  runApp(
    ClerkAuth(
      config: ClerkAuthConfig(publishableKey: _clerkKey),
      child: MaterialApp(
        title: 'Kaari Works',
        navigatorKey: navigatorKey,
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          useMaterial3: true,
          scaffoldBackgroundColor: _paper,
          colorScheme: ColorScheme.fromSeed(seedColor: _green),
          appBarTheme: const AppBarTheme(
            backgroundColor: _paper,
            foregroundColor: _ink,
            centerTitle: false,
          ),
        ),
        home: const AuthGate(),
      ),
    ),
  );
}

class MissingConfigurationApp extends StatelessWidget {
  const MissingConfigurationApp({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp(
        home: Scaffold(
          body: Center(
            child: Padding(
              padding: const EdgeInsets.all(28),
              child: Text(
                'Add your Clerk publishable key and API base URL when launching the app. See mobile/README.md.',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ),
          ),
        ),
      );
}

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) => ClerkErrorListener(
        child: ClerkAuthBuilder(
          signedInBuilder: (context, auth) => const MarketplaceShell(),
          signedOutBuilder: (context, auth) => Scaffold(
            body: SafeArea(
              child: Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    if (_googleWebClientId.isNotEmpty) ...[
                      NativeGoogleSignInButton(webClientId: _googleWebClientId),
                      const SizedBox(height: 16),
                    ],
                    const ClerkAuthentication(),
                  ]),
                ),
              ),
            ),
          ),
        ),
      );
}

class NativeGoogleSignInButton extends StatefulWidget {
  const NativeGoogleSignInButton({super.key, required this.webClientId});
  final String webClientId;

  @override
  State<NativeGoogleSignInButton> createState() => _NativeGoogleSignInButtonState();
}

class _NativeGoogleSignInButtonState extends State<NativeGoogleSignInButton> {
  bool _busy = false;

  Future<void> _signIn() async {
    setState(() => _busy = true);
    try {
      final auth = ClerkAuth.of(context);
      await auth.resetClient();
      final google = GoogleSignIn.instance;
      await google.initialize(serverClientId: widget.webClientId, nonce: const Uuid().v4());
      final account = await google.authenticate(scopeHint: const ['openid', 'email', 'profile']);
      final token = account.authentication.idToken;
      if (token == null) throw Exception('Google did not return an ID token. Check OAuth client configuration.');
      await auth.idTokenSignIn(provider: clerk.IdTokenProvider.google, token: token);
      if (auth.signUp case clerk.SignUp signUp when signUp.missingFields.isNotEmpty) {
        final parts = account.displayName?.split(' ') ?? [];
        await auth.attemptSignUp(
          firstName: signUp.missing(clerk.Field.firstName) ? (parts.isEmpty ? null : parts.first) : null,
          lastName: signUp.missing(clerk.Field.lastName) ? (parts.length > 1 ? parts.last : null) : null,
        );
      }
    } catch (error) {
      if (mounted) _notice('Google sign-in failed: $error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => SizedBox(
        width: double.infinity,
        child: OutlinedButton.icon(
          onPressed: _busy ? null : _signIn,
          icon: const Icon(Icons.login),
          label: Text(_busy ? 'Connecting to Google…' : 'Continue with Google'),
          style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
        ),
      );
}

class MarketplaceShell extends StatefulWidget {
  const MarketplaceShell({super.key});

  @override
  State<MarketplaceShell> createState() => _MarketplaceShellState();
}

class _MarketplaceShellState extends State<MarketplaceShell> {
  int _index = 0;
  final _refresh = ValueNotifier<int>(0);

  @override
  void dispose() {
    _refresh.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      BrowsePage(onChanged: () => _refresh.value++),
      SellerPage(onPublished: () => _refresh.value++),
      InboxPage(refresh: _refresh),
    ];
    return Scaffold(
      appBar: AppBar(
        title: const Text('Kaari Works', style: TextStyle(fontWeight: FontWeight.w800)),
        actions: const [Padding(padding: EdgeInsets.only(right: 12), child: ClerkUserButton())],
      ),
      body: IndexedStack(index: _index, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (value) => setState(() => _index = value),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.storefront_outlined), selectedIcon: Icon(Icons.storefront), label: 'Discover'),
          NavigationDestination(icon: Icon(Icons.add_box_outlined), selectedIcon: Icon(Icons.add_box), label: 'Sell'),
          NavigationDestination(icon: Icon(Icons.forum_outlined), selectedIcon: Icon(Icons.forum), label: 'Enquiries'),
        ],
      ),
    );
  }
}

class Product {
  Product(this.data);
  final Map<String, dynamic> data;
  int get id => data['id'] as int;
  String get name => data['name'] as String? ?? 'Handmade product';
  String get category => data['category'] as String? ?? 'Craft';
  String get description => data['description'] as String? ?? '';
  String get seller => data['seller_name'] as String? ?? 'Independent artisan';
  int get price => data['price_inr'] as int? ?? 0;
  int get minimum => data['minimum_order_quantity'] as int? ?? 1;
  String? get image => data['image_url'] as String?;
}

class Api {
  Api(BuildContext context) : _context = context;
  final BuildContext _context;

  Future<String?> _token() async {
    final token = await ClerkAuth.of(_context).sessionToken();
    return token.jwt;
  }

  Future<dynamic> request(String path, {String method = 'GET', Map<String, dynamic>? body, bool auth = false}) async {
    final uri = Uri.parse('$_apiBase$path');
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (auth) {
      final token = await _token();
      if (token == null || token.isEmpty) throw Exception('Please sign in and try again.');
      headers['Authorization'] = 'Bearer $token';
    }
    final request = http.Request(method, uri)..headers.addAll(headers);
    if (body != null) request.body = jsonEncode(body);
    final streamed = await request.send().timeout(const Duration(seconds: 20));
    final response = await http.Response.fromStream(streamed);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      String message = 'Request failed (${response.statusCode}).';
      try {
        message = jsonDecode(response.body)['detail']?.toString() ?? message;
      } catch (_) {}
      throw Exception(message);
    }
    if (response.body.isEmpty) return null;
    return jsonDecode(response.body);
  }
}

class BrowsePage extends StatefulWidget {
  const BrowsePage({super.key, required this.onChanged});
  final VoidCallback onChanged;

  @override
  State<BrowsePage> createState() => _BrowsePageState();
}

class _BrowsePageState extends State<BrowsePage> {
  final _search = TextEditingController();
  late Future<List<Product>> _products;

  @override
  void initState() {
    super.initState();
    _products = _load();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<List<Product>> _load([String query = '']) async {
    final encoded = Uri.encodeQueryComponent(query);
    final response = await http.get(Uri.parse('$_apiBase/api/products${query.isEmpty ? '' : '?q=$encoded'}')).timeout(const Duration(seconds: 20));
    if (response.statusCode != 200) throw Exception('Could not load marketplace (${response.statusCode}).');
    return (jsonDecode(response.body) as List)
        .map((item) => Product(Map<String, dynamic>.from(item as Map)))
        .toList();
  }

  void _searchProducts(String value) => setState(() => _products = _load(value.trim()));

  @override
  Widget build(BuildContext context) => RefreshIndicator(
        onRefresh: () async => setState(() => _products = _load(_search.text.trim())),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(18, 12, 18, 28),
          children: [
            Container(
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(color: const Color(0xFFEAF5EF), borderRadius: BorderRadius.circular(22)),
              child: const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('MADE BY HAND, READY FOR THE WORLD', style: TextStyle(color: _green, fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1)),
                SizedBox(height: 9),
                Text('Find your next\nmeaningful product.', style: TextStyle(color: _ink, fontSize: 27, height: 1.15, fontWeight: FontWeight.w800)),
                SizedBox(height: 8),
                Text('Discover independent artisans and request bulk quotes directly.'),
              ]),
            ),
            const SizedBox(height: 18),
            TextField(
              controller: _search,
              onSubmitted: _searchProducts,
              decoration: InputDecoration(prefixIcon: const Icon(Icons.search), hintText: 'Search crafts and materials', filled: true, fillColor: Colors.white, border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none)),
            ),
            const SizedBox(height: 18),
            const Text('Handmade for you', style: TextStyle(fontSize: 19, fontWeight: FontWeight.w800, color: _ink)),
            const SizedBox(height: 8),
            FutureBuilder<List<Product>>(
              future: _products,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) return const Padding(padding: EdgeInsets.all(40), child: Center(child: CircularProgressIndicator()));
                if (snapshot.hasError) return _RetryMessage(message: snapshot.error.toString(), onRetry: () => setState(() => _products = _load(_search.text.trim())));
                final items = snapshot.data ?? [];
                if (items.isEmpty) return const _EmptyState(icon: Icons.storefront_outlined, title: 'No listings yet', message: 'Artisan products will appear here once sellers publish them.');
                return Column(children: items.map((product) => _ProductCard(product: product, onContact: () => _contact(product))).toList());
              },
            ),
          ],
        ),
      );

  Future<void> _contact(Product product) async {
    final quantity = TextEditingController(text: '${product.minimum}');
    final message = TextEditingController(text: 'Hello, I am interested in ${product.name}. Please share availability and bulk pricing.');
    final submit = await showDialog<bool>(context: context, builder: (context) => AlertDialog(
      title: Text('Contact ${product.seller}'),
      content: Column(mainAxisSize: MainAxisSize.min, children: [TextField(controller: quantity, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: 'Quantity (minimum ${product.minimum})')), const SizedBox(height: 12), TextField(controller: message, minLines: 3, maxLines: 5, decoration: const InputDecoration(labelText: 'Message'))]),
      actions: [TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')), FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Send enquiry'))],
    ));
    if (submit != true || !mounted) return;
    try {
      await Api(context).request('/api/products/${product.id}/inquiries', method: 'POST', auth: true, body: {'quantity': int.tryParse(quantity.text) ?? product.minimum, 'message': message.text.trim()});
      widget.onChanged();
      if (mounted) _notice('Enquiry sent to the seller.');
    } catch (error) {
      if (mounted) _notice(error.toString());
    }
  }
}

class _ProductCard extends StatelessWidget {
  const _ProductCard({required this.product, required this.onContact});
  final Product product;
  final VoidCallback onContact;

  @override
  Widget build(BuildContext context) => Card(
        margin: const EdgeInsets.only(bottom: 13),
        clipBehavior: Clip.antiAlias,
        color: Colors.white,
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (product.image != null && product.image!.startsWith('http')) Image.network(product.image!, height: 180, width: double.infinity, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const _ArtPlaceholder()) else const _ArtPlaceholder(),
          Padding(padding: const EdgeInsets.fromLTRB(15, 13, 15, 15), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(product.category.toUpperCase(), style: const TextStyle(color: _green, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 1)),
            const SizedBox(height: 4),
            Text(product.name, style: const TextStyle(fontSize: 18, color: _ink, fontWeight: FontWeight.w800)),
            const SizedBox(height: 3),
            Text('By ${product.seller}', style: const TextStyle(color: Colors.black54)),
            if (product.description.isNotEmpty) ...[const SizedBox(height: 9), Text(product.description, maxLines: 3, overflow: TextOverflow.ellipsis)],
            const SizedBox(height: 12),
            Row(children: [Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('₹${product.price} / piece', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)), Text('Bulk orders · min ${product.minimum}', style: const TextStyle(color: Colors.black54, fontSize: 12))])), FilledButton.icon(onPressed: onContact, icon: const Icon(Icons.chat_bubble_outline, size: 17), label: const Text('Contact'))]),
          ])),
        ]),
      );
}

class _ArtPlaceholder extends StatelessWidget {
  const _ArtPlaceholder();
  @override
  Widget build(BuildContext context) => Container(height: 165, width: double.infinity, color: const Color(0xFFEAF2E9), alignment: Alignment.center, child: const Text('🧵', style: TextStyle(fontSize: 58)));
}

class SellerPage extends StatefulWidget {
  const SellerPage({super.key, required this.onPublished});
  final VoidCallback onPublished;

  @override
  State<SellerPage> createState() => _SellerPageState();
}

class _SellerPageState extends State<SellerPage> {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _description = TextEditingController();
  final _price = TextEditingController();
  final _cost = TextEditingController();
  final _quantity = TextEditingController(text: '20');
  final _minimum = TextEditingController(text: '5');
  bool _saving = false;
  String _category = 'Textiles';

  @override
  void dispose() {
    for (final item in [_name, _description, _price, _cost, _quantity, _minimum]) { item.dispose(); }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ListView(padding: const EdgeInsets.all(18), children: [
        const Text('Bring your craft to market', style: TextStyle(fontSize: 23, fontWeight: FontWeight.w800, color: _ink)),
        const SizedBox(height: 6),
        const Text('Share a listing with buyers and receive direct bulk enquiries.'),
        const SizedBox(height: 18),
        Card(color: Colors.white, child: Padding(padding: const EdgeInsets.all(18), child: Form(key: _form, child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          _field(_name, 'Product name', required: true),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(value: _category, decoration: const InputDecoration(labelText: 'Category'), items: const ['Textiles', 'Pottery & ceramics', 'Woodwork', 'Jewellery', 'Home decor', 'Baskets', 'Paintings', 'Other'].map((x) => DropdownMenuItem(value: x, child: Text(x))).toList(), onChanged: (x) => setState(() => _category = x ?? _category)),
          const SizedBox(height: 12),
          _field(_description, 'Product story and details', required: true, lines: 4),
          const SizedBox(height: 12),
          Row(children: [Expanded(child: _field(_price, 'Price per piece (₹)', number: true, required: true)), const SizedBox(width: 10), Expanded(child: _field(_cost, 'Making cost (₹)', number: true))]),
          const SizedBox(height: 12),
          Row(children: [Expanded(child: _field(_quantity, 'Available quantity', number: true)), const SizedBox(width: 10), Expanded(child: _field(_minimum, 'Minimum bulk order', number: true, required: true))]),
          const SizedBox(height: 18),
          FilledButton.icon(onPressed: _saving ? null : _publish, icon: const Icon(Icons.publish), label: Text(_saving ? 'Publishing…' : 'Publish listing')),
        ])))),
        const SizedBox(height: 12),
        const Text('Tip: keep a sample available and set a minimum quantity you can reliably make.', style: TextStyle(color: Colors.black54)),
      ]);

  Widget _field(TextEditingController controller, String label, {bool number = false, bool required = false, int lines = 1}) => TextFormField(
        controller: controller,
        minLines: lines,
        maxLines: lines,
        keyboardType: number ? TextInputType.number : TextInputType.text,
        decoration: InputDecoration(labelText: label, border: const OutlineInputBorder()),
        validator: (value) {
          if (required && (value == null || value.trim().isEmpty)) return 'This field is required.';
          if (number && value != null && value.isNotEmpty && int.tryParse(value) == null) return 'Enter a whole number.';
          return null;
        },
      );

  Future<void> _publish() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      await Api(context).request('/api/products', method: 'POST', auth: true, body: {
        'name': _name.text.trim(), 'category': _category, 'description': _description.text.trim(),
        'price_inr': int.parse(_price.text), 'making_cost_inr': int.tryParse(_cost.text),
        'quantity_available': int.tryParse(_quantity.text) ?? 1,
        'minimum_order_quantity': int.tryParse(_minimum.text) ?? 1, 'status': 'published',
      });
      for (final item in [_name, _description, _price, _cost]) { item.clear(); }
      widget.onPublished();
      if (mounted) _notice('Your product is now listed for buyers.');
    } catch (error) {
      if (mounted) _notice(error.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
}

class InboxPage extends StatelessWidget {
  const InboxPage({super.key, required this.refresh});
  final ValueListenable<int> refresh;

  @override
  Widget build(BuildContext context) => ValueListenableBuilder<int>(
        valueListenable: refresh,
        builder: (context, value, _) => FutureBuilder<dynamic>(
          key: ValueKey(value),
          future: Api(context).request('/api/inquiries', auth: true),
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
            if (snapshot.hasError) return _RetryMessage(message: snapshot.error.toString(), onRetry: () {});
            final items = (snapshot.data as List? ?? []).cast<Map<String, dynamic>>();
            if (items.isEmpty) return const _EmptyState(icon: Icons.forum_outlined, title: 'No enquiries yet', message: 'Buyer messages and your seller replies will show up here.');
            return ListView(padding: const EdgeInsets.all(18), children: [const Text('Buyer and seller enquiries', style: TextStyle(fontSize: 21, fontWeight: FontWeight.w800, color: _ink)), const SizedBox(height: 10), ...items.map((item) => _InquiryCard(item: item, onReplied: () => refresh.value++))]);
          },
        ),
      );
}

class _InquiryCard extends StatelessWidget {
  const _InquiryCard({required this.item, required this.onReplied});
  final Map<String, dynamic> item;
  final VoidCallback onReplied;

  @override
  Widget build(BuildContext context) => Card(color: Colors.white, margin: const EdgeInsets.only(bottom: 12), child: Padding(padding: const EdgeInsets.all(15), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('${item['product_name']} · ${item['quantity']} units', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
        const SizedBox(height: 7),
        Text(item['message'] as String? ?? ''),
        const SizedBox(height: 8),
        Text('Status: ${item['status']}', style: const TextStyle(color: _green, fontWeight: FontWeight.w700)),
        if ((item['seller_reply'] as String?)?.isNotEmpty == true) Padding(padding: const EdgeInsets.only(top: 8), child: Text('Seller reply: ${item['seller_reply']}')),
        if (item['seller_id'] == _currentUserId(context)) Align(alignment: Alignment.centerRight, child: TextButton.icon(onPressed: () => _reply(context, item), icon: const Icon(Icons.reply), label: const Text('Reply to buyer'))),
      ])));

  String? _currentUserId(BuildContext context) => ClerkAuth.of(context).user?.id;

  Future<void> _reply(BuildContext context, Map<String, dynamic> item) async {
    final controller = TextEditingController();
    final message = await showDialog<String>(context: context, builder: (context) => AlertDialog(title: const Text('Reply to buyer'), content: TextField(controller: controller, minLines: 2, maxLines: 5, decoration: const InputDecoration(hintText: 'Write your response')), actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')), FilledButton(onPressed: () => Navigator.pop(context, controller.text.trim()), child: const Text('Send reply'))]));
    if (message == null || message.isEmpty || !context.mounted) return;
    try {
      await Api(context).request('/api/inquiries/${item['id']}/reply', method: 'POST', auth: true, body: {'message': message});
      onReplied();
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Reply saved.')));
    } catch (error) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString())));
    }
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.icon, required this.title, required this.message});
  final IconData icon;
  final String title;
  final String message;
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.symmetric(vertical: 54, horizontal: 26), child: Column(children: [Icon(icon, size: 42, color: _green), const SizedBox(height: 12), Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)), const SizedBox(height: 5), Text(message, textAlign: TextAlign.center, style: const TextStyle(color: Colors.black54))]));
}

class _RetryMessage extends StatelessWidget {
  const _RetryMessage({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;
  @override
  Widget build(BuildContext context) => Center(child: Padding(padding: const EdgeInsets.all(24), child: Column(mainAxisSize: MainAxisSize.min, children: [const Icon(Icons.wifi_off, size: 38, color: _green), const SizedBox(height: 10), Text(message, textAlign: TextAlign.center), const SizedBox(height: 12), OutlinedButton(onPressed: onRetry, child: const Text('Try again'))])));
}

void _notice(String message) {
  // Resolve the current root messenger using the navigator's active context.
  final context = navigatorKey.currentContext;
  if (context == null) return;
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
}

final navigatorKey = GlobalKey<NavigatorState>();
